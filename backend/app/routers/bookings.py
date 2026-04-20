import json
import secrets
import string
from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (
    Booking, BookingAuditLog, BookingLineItem, BookingStatus, CatalogItem,
    Payment, User, UserRole, Venue, PriceType,
)
from ..schemas import (
    BookingCreate, BookingOut, BookingOutWithPayments, BookingUpdate,
    PaymentCreate, PaymentOut, PaymentsSummary, BookingAuditLogOut,
    PriceBreakdown,
)
from ..deps import get_current_user, get_optional_user
from ..core.availability import is_slot_available, check_overlap
from ..core.pricing import (
    calculate_booking_breakdown,
    calculate_line_item_total,
)
from ..core.email import send_booking_confirmation_emails
from ..core.security import get_password_hash
from ..core.cal_com import create_cal_booking, get_cal_available_times

router = APIRouter()


def _reconcile_cal_cancelled(
    db: Session,
    venue_id: int,
    booking_date,
    start_time,
    end_time,
    duration_hours: float,
) -> bool:
    """
    Called when is_slot_available() returns False (local DB conflict).

    If cal.com shows the slot as available it means a booking was cancelled
    directly in cal.com without going through our admin panel, leaving the
    local DB out of sync.  In that case we auto-cancel the stale local
    booking(s) and return True so the new booking can proceed.

    Returns False when cal.com also considers the slot unavailable.
    """
    cal_slots = get_cal_available_times(booking_date, int(duration_hours * 60))
    if cal_slots is None or start_time not in cal_slots:
        return False

    venue = db.get(Venue, venue_id)
    buf = venue.buffer_minutes if venue else 30
    conflicting = (
        db.query(Booking)
        .filter(
            Booking.venue_id == venue_id,
            Booking.date == booking_date,
            Booking.status == BookingStatus.confirmed,
        )
        .all()
    )
    for bk in conflicting:
        if check_overlap(start_time, end_time, bk.start_time, bk.end_time, buf):
            bk.status = BookingStatus.cancelled
            bk.notes = (bk.notes or "") + "\n[Auto-cancelled: synced from cal.com cancellation]"
    db.flush()
    return True


def _gen_code() -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "DZ-" + "".join(secrets.choice(alphabet) for _ in range(8))


def _extract_guest_phone(notes: str | None) -> str | None:
    if not notes:
        return None
    prefix = "Guest phone:"
    for line in notes.splitlines():
        if line.startswith(prefix):
            return line[len(prefix):].strip() or None
    return None


def serialize_booking(booking: Booking, breakdown: PriceBreakdown | None = None) -> BookingOut:
    payload = BookingOut.model_validate(booking).model_dump()
    payload["contact_name"] = booking.contact_name or (booking.user.name if booking.user else None)
    payload["contact_email"] = booking.contact_email or (booking.user.email if booking.user else None)
    payload["contact_phone"] = booking.contact_phone or _extract_guest_phone(booking.notes)
    if breakdown is not None:
        payload["price_breakdown"] = breakdown.model_dump()
    return BookingOut(**payload)


@router.post("/preview", response_model=PriceBreakdown)
def preview_booking(
    payload: BookingCreate,
    db: Session = Depends(get_db),
):
    """Return price breakdown without creating a booking. No auth required."""
    venue: Venue = db.get(Venue, payload.venue_id)
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")

    line_items_data = []
    for li_input in payload.line_items:
        cat_item: CatalogItem = db.get(CatalogItem, li_input.catalog_item_id)
        if not cat_item or not cat_item.active:
            raise HTTPException(
                status_code=400,
                detail=f"Catalog item {li_input.catalog_item_id} not found or inactive",
            )
        lt = calculate_line_item_total(
            cat_item.price,
            cat_item.price_type.value,
            li_input.quantity,
            payload.duration_hours,
        )
        line_items_data.append({
            "catalog_item_id": cat_item.id,
            "item_type": cat_item.type.value,
            "item_name": cat_item.name,
            "quantity": li_input.quantity,
            "unit_price": cat_item.price,
            "price_type": cat_item.price_type.value,
            "unit_label": cat_item.unit_label,
            "line_total": lt,
        })

    breakdown = calculate_booking_breakdown(
        venue=venue,
        duration_hours=payload.duration_hours,
        line_items_data=line_items_data,
        foodcourt_tables_count=payload.foodcourt_tables_count,
        extra_rooms_count=payload.extra_rooms_count,
    )
    return PriceBreakdown(**breakdown)


@router.post("", response_model=BookingOut, status_code=status.HTTP_201_CREATED)
def create_booking(
    payload: BookingCreate,
    background_tasks: BackgroundTasks,
    current_user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    venue: Venue = db.get(Venue, payload.venue_id)
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")

    booking_user = current_user
    guest_notes: list[str] = []

    if booking_user is None:
        if not payload.guest_name or not payload.guest_email or not payload.guest_phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Guest name, email, and phone are required to complete the booking",
            )

        existing_user = db.query(User).filter(User.email == payload.guest_email.lower()).first()
        if existing_user:
            # Allow guest checkout with existing email — link booking to that account
            booking_user = existing_user
        else:
            booking_user = User(
                name=payload.guest_name,
                email=payload.guest_email.lower(),
                password_hash=get_password_hash(secrets.token_urlsafe(24)),
            )
            db.add(booking_user)
            db.flush()

        guest_notes.append(f"Guest phone: {payload.guest_phone}")

    if payload.duration_hours < venue.min_hours:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum booking duration is {venue.min_hours} hours",
        )

    # Compute end time
    start_dt = datetime.combine(payload.date, payload.start_time)
    end_dt = start_dt + timedelta(hours=payload.duration_hours)
    end_time = end_dt.time()

    # Check availability
    if not is_slot_available(db, venue.id, payload.date, payload.start_time, end_time):
        # Local DB says unavailable — check whether cal.com freed this slot
        # (booking cancelled in cal.com but not yet synced to local DB)
        if not _reconcile_cal_cancelled(
            db, venue.id, payload.date, payload.start_time, end_time, payload.duration_hours
        ):
            raise HTTPException(
                status_code=409,
                detail="Selected time slot is not available",
            )

    # Build line items
    line_items_data = []
    db_line_items = []

    for li_input in payload.line_items:
        cat_item: CatalogItem = db.get(CatalogItem, li_input.catalog_item_id)
        if not cat_item or not cat_item.active:
            raise HTTPException(
                status_code=400,
                detail=f"Catalog item {li_input.catalog_item_id} not found or inactive",
            )
        lt = calculate_line_item_total(
            cat_item.price,
            cat_item.price_type.value,
            li_input.quantity,
            payload.duration_hours,
        )
        li_data = {
            "catalog_item_id": cat_item.id,
            "item_type": cat_item.type.value,
            "item_name": cat_item.name,
            "quantity": li_input.quantity,
            "unit_price": cat_item.price,
            "price_type": cat_item.price_type.value,
            "unit_label": cat_item.unit_label,
            "line_total": lt,
        }
        line_items_data.append(li_data)
        db_line_items.append(BookingLineItem(**li_data))

    # Price breakdown
    breakdown = calculate_booking_breakdown(
        venue=venue,
        duration_hours=payload.duration_hours,
        line_items_data=line_items_data,
        foodcourt_tables_count=payload.foodcourt_tables_count,
        extra_rooms_count=payload.extra_rooms_count,
    )

    # Generate unique confirmation code
    for _ in range(10):
        code = _gen_code()
        if not db.query(Booking).filter(Booking.confirmation_code == code).first():
            break

    booking = Booking(
        venue_id=venue.id,
        user_id=booking_user.id,
        date=payload.date,
        start_time=payload.start_time,
        end_time=end_time,
        status=BookingStatus.confirmed,
        total_price=breakdown["total_with_gst"],
        confirmation_code=code,
        contact_name=payload.guest_name or booking_user.name,
        contact_email=(payload.guest_email.lower() if payload.guest_email else booking_user.email),
        contact_phone=payload.guest_phone,
        notes="\n".join([note for note in [payload.notes, *guest_notes] if note]),
        rooms_included_count=venue.included_rooms_count,
        extra_rooms_count=payload.extra_rooms_count,
        foodcourt_tables_count=payload.foodcourt_tables_count,
        foodcourt_table_notes=payload.foodcourt_table_notes,
    )
    db.add(booking)
    db.flush()  # get booking.id before adding line items

    for li in db_line_items:
        li.booking_id = booking.id
        db.add(li)

    db.commit()
    db.refresh(booking)

    # Mirror to cal.com (best-effort; failure does not block local booking)
    cal_uid = create_cal_booking(
        booking_date=booking.date,
        start_time=booking.start_time,
        end_time=booking.end_time,
        name=booking.contact_name or booking_user.name,
        email=booking.contact_email or booking_user.email,
        confirmation_code=code,
        total_price=booking.total_price,
    )
    if cal_uid:
        booking.cal_booking_uid = cal_uid
        db.commit()

    response = serialize_booking(booking, PriceBreakdown(**breakdown))
    background_tasks.add_task(
        send_booking_confirmation_emails,
        response.model_dump(mode="python"),
        {
            "name": venue.name,
            "address": venue.address,
        },
    )

    return response


@router.get("/my", response_model=List[BookingOut])
def my_bookings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bookings = (
        db.query(Booking)
        .filter(Booking.user_id == current_user.id)
        .order_by(Booking.created_at.desc())
        .all()
    )
    return [serialize_booking(booking) for booking in bookings]


@router.get("/{booking_id}", response_model=BookingOut)
def get_booking(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    booking = db.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    # Users can only see their own bookings; admins see all
    from ..models import UserRole
    if current_user.role != UserRole.admin and booking.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return serialize_booking(booking)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _total_paid(booking: Booking) -> float:
    return sum(
        p.amount for p in booking.payments if p.status == "completed"
    )


def serialize_booking_with_payments(booking: Booking, breakdown: PriceBreakdown | None = None) -> BookingOutWithPayments:
    base = serialize_booking(booking, breakdown)
    total_paid = _total_paid(booking)
    remaining_due = max(0.0, booking.total_price - total_paid)
    audit = [BookingAuditLogOut.model_validate(a) for a in booking.audit_logs]
    return BookingOutWithPayments(
        **base.model_dump(),
        total_paid=total_paid,
        remaining_due=remaining_due,
        audit_logs=audit,
    )


def _build_line_items(payload_line_items, duration_hours: float, db: Session):
    """Validate and build line item dicts + ORM objects from input."""
    line_items_data = []
    db_line_items = []
    for li_input in payload_line_items:
        cat_item: CatalogItem = db.get(CatalogItem, li_input.catalog_item_id)
        if not cat_item or not cat_item.active:
            raise HTTPException(
                status_code=400,
                detail=f"Catalog item {li_input.catalog_item_id} not found or inactive",
            )
        lt = calculate_line_item_total(
            cat_item.price,
            cat_item.price_type.value,
            li_input.quantity,
            duration_hours,
        )
        li_data = {
            "catalog_item_id": cat_item.id,
            "item_type": cat_item.type.value,
            "item_name": cat_item.name,
            "quantity": li_input.quantity,
            "unit_price": cat_item.price,
            "price_type": cat_item.price_type.value,
            "unit_label": cat_item.unit_label,
            "line_total": lt,
        }
        line_items_data.append(li_data)
        db_line_items.append(BookingLineItem(**li_data))
    return line_items_data, db_line_items


# ---------------------------------------------------------------------------
# Lookup by confirmation code (public – no auth required)
# ---------------------------------------------------------------------------

@router.get("/by-code/{confirmation_code}", response_model=BookingOutWithPayments)
def get_booking_by_code(
    confirmation_code: str,
    db: Session = Depends(get_db),
):
    """Fetch a booking by its confirmation code. No authentication required.
    Anyone with the code can view the booking (works like a shareable link)."""
    booking = (
        db.query(Booking)
        .filter(Booking.confirmation_code == confirmation_code.upper())
        .first()
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return serialize_booking_with_payments(booking)


# ---------------------------------------------------------------------------
# Update booking (confirmation_code is used as auth token)
# ---------------------------------------------------------------------------

@router.put("/{booking_id}", response_model=BookingOutWithPayments)
def update_booking(
    booking_id: int,
    payload: BookingUpdate,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    """Modify a confirmed booking. The confirmation_code in the payload acts as
    the authorization credential — anyone holding the code may update."""
    booking = db.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Authorise: confirmation_code must match, OR requester is admin
    is_admin = current_user and current_user.role == UserRole.admin
    if not is_admin and booking.confirmation_code != payload.confirmation_code.upper():
        raise HTTPException(status_code=403, detail="Invalid confirmation code")

    if booking.status == BookingStatus.cancelled:
        raise HTTPException(status_code=409, detail="Cannot modify a cancelled booking")

    venue: Venue = db.get(Venue, booking.venue_id)

    # --- Snapshot before change ---
    snapshot = serialize_booking(booking).model_dump(mode="json")

    # --- Determine new field values ---
    new_date = payload.date or booking.date
    new_duration = payload.duration_hours if payload.duration_hours is not None else (
        # derive duration from existing times
        (datetime.combine(booking.date, booking.end_time) -
         datetime.combine(booking.date, booking.start_time)).seconds / 3600
    )
    new_start_time = payload.start_time or booking.start_time

    if new_duration < venue.min_hours:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum booking duration is {venue.min_hours} hours",
        )

    # Compute new end time
    start_dt = datetime.combine(new_date, new_start_time)
    end_dt = start_dt + timedelta(hours=new_duration)
    new_end_time = end_dt.time()

    # Check slot availability (exclude this booking's current slot)
    slot_changed = (
        new_date != booking.date
        or new_start_time != booking.start_time
        or new_end_time != booking.end_time
    )
    if slot_changed:
        if not is_slot_available(db, venue.id, new_date, new_start_time, new_end_time, exclude_booking_id=booking.id):
            if not _reconcile_cal_cancelled(
                db, venue.id, new_date, new_start_time, new_end_time, new_duration
            ):
                raise HTTPException(
                    status_code=409,
                    detail="Selected time slot is no longer available. Please choose a different time.",
                )

    # --- Rebuild line items if provided ---
    new_extra_rooms = payload.extra_rooms_count if payload.extra_rooms_count is not None else booking.extra_rooms_count
    new_foodcourt_tables = payload.foodcourt_tables_count if payload.foodcourt_tables_count is not None else booking.foodcourt_tables_count

    if payload.line_items is not None:
        line_items_data, db_line_items = _build_line_items(payload.line_items, new_duration, db)
        # Replace existing line items
        for li in list(booking.line_items):
            db.delete(li)
        db.flush()
        for li in db_line_items:
            li.booking_id = booking.id
            db.add(li)
    else:
        # Recalculate totals using existing line items data
        line_items_data = [
            {
                "catalog_item_id": li.catalog_item_id,
                "item_type": li.item_type,
                "item_name": li.item_name,
                "quantity": li.quantity,
                "unit_price": li.unit_price,
                "price_type": li.price_type,
                "unit_label": li.unit_label,
                "line_total": li.line_total,
            }
            for li in booking.line_items
        ]
        # Update line totals if duration changed
        if new_duration != (snapshot.get("price_breakdown") or {}).get("duration_hours"):
            for li_orm, li_data in zip(booking.line_items, line_items_data):
                if li_data["price_type"] == "per_hour":
                    new_lt = calculate_line_item_total(
                        li_data["unit_price"], "per_hour", li_data["quantity"], new_duration
                    )
                    li_orm.line_total = new_lt
                    li_data["line_total"] = new_lt

    breakdown = calculate_booking_breakdown(
        venue=venue,
        duration_hours=new_duration,
        line_items_data=line_items_data,
        foodcourt_tables_count=new_foodcourt_tables,
        extra_rooms_count=new_extra_rooms,
    )

    # --- Build change summary ---
    changes = []
    if new_date != booking.date:
        changes.append(f"Date: {booking.date} → {new_date}")
    if new_start_time != booking.start_time:
        changes.append(f"Start time: {booking.start_time} → {new_start_time}")
    if new_end_time != booking.end_time:
        changes.append(f"End time: {booking.end_time} → {new_end_time}")
    if new_extra_rooms != booking.extra_rooms_count:
        changes.append(f"Extra rooms: {booking.extra_rooms_count} → {new_extra_rooms}")
    if new_foodcourt_tables != booking.foodcourt_tables_count:
        changes.append(f"Food court tables: {booking.foodcourt_tables_count} → {new_foodcourt_tables}")
    old_total = booking.total_price
    new_total = breakdown["total_with_gst"]
    if abs(old_total - new_total) > 0.01:
        changes.append(f"Total price: ₹{old_total:,.0f} → ₹{new_total:,.0f}")
    if payload.line_items is not None:
        changes.append("Line items updated")
    if payload.contact_name and payload.contact_name != booking.contact_name:
        changes.append(f"Contact name updated")
    if payload.contact_email and payload.contact_email != booking.contact_email:
        changes.append(f"Contact email updated")
    if payload.contact_phone and payload.contact_phone != booking.contact_phone:
        changes.append(f"Contact phone updated")
    if payload.notes is not None and payload.notes != booking.notes:
        changes.append("Notes updated")
    if not changes:
        changes.append("No field changes detected")

    # --- Record audit log ---
    changed_by_user_id = current_user.id if current_user else None
    changed_by_name = payload.changed_by_name or (current_user.name if current_user else "Guest")
    audit_log = BookingAuditLog(
        booking_id=booking.id,
        previous_snapshot=json.dumps(snapshot, default=str),
        changed_by_user_id=changed_by_user_id,
        changed_by_name=changed_by_name,
        change_summary="; ".join(changes),
    )
    db.add(audit_log)

    # --- Apply updates ---
    booking.date = new_date
    booking.start_time = new_start_time
    booking.end_time = new_end_time
    booking.extra_rooms_count = new_extra_rooms
    booking.foodcourt_tables_count = new_foodcourt_tables
    booking.total_price = new_total
    if payload.foodcourt_table_notes is not None:
        booking.foodcourt_table_notes = payload.foodcourt_table_notes
    if payload.notes is not None:
        booking.notes = payload.notes
    if payload.contact_name:
        booking.contact_name = payload.contact_name
    if payload.contact_email:
        booking.contact_email = payload.contact_email.lower()
    if payload.contact_phone:
        booking.contact_phone = payload.contact_phone
    if payload.alt_email is not None:
        booking.alt_email = payload.alt_email.lower() if payload.alt_email else None
    if payload.alt_phone is not None:
        booking.alt_phone = payload.alt_phone or None

    db.commit()
    db.refresh(booking)

    return serialize_booking_with_payments(booking, PriceBreakdown(**breakdown))


# ---------------------------------------------------------------------------
# Payment endpoints
# ---------------------------------------------------------------------------

@router.get("/{booking_id}/payments", response_model=PaymentsSummary)
def get_booking_payments(
    booking_id: int,
    confirmation_code: str,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    """List payments for a booking. Auth via confirmation_code query param or admin token."""
    booking = db.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    is_admin = current_user and current_user.role == UserRole.admin
    if not is_admin and booking.confirmation_code != confirmation_code.upper():
        raise HTTPException(status_code=403, detail="Invalid confirmation code")

    payments = [PaymentOut.model_validate(p) for p in booking.payments]
    total_paid = sum(p.amount for p in booking.payments if p.status == "completed")
    remaining = max(0.0, booking.total_price - total_paid)
    return PaymentsSummary(
        payments=payments,
        total_paid=total_paid,
        booking_total=booking.total_price,
        remaining_due=remaining,
    )


@router.post("/{booking_id}/payments", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
def record_payment(
    booking_id: int,
    payload: PaymentCreate,
    confirmation_code: str,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    """Record a payment against a booking (dummy/demo payment flow).
    Auth via confirmation_code query param or admin token."""
    booking = db.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    is_admin = current_user and current_user.role == UserRole.admin
    if not is_admin and booking.confirmation_code != confirmation_code.upper():
        raise HTTPException(status_code=403, detail="Invalid confirmation code")

    if booking.status == BookingStatus.cancelled:
        raise HTTPException(status_code=409, detail="Cannot record payment for a cancelled booking")

    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be positive")

    payment = Payment(
        booking_id=booking.id,
        amount=payload.amount,
        status=payload.status,
        payment_ref=payload.payment_ref,
        notes=payload.notes,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return PaymentOut.model_validate(payment)
