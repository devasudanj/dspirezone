import secrets
import string
from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (
    Booking, BookingLineItem, BookingStatus, CatalogItem,
    User, Venue, PriceType
)
from ..schemas import BookingCreate, BookingOut, PriceBreakdown
from ..deps import get_current_user
from ..core.availability import is_slot_available
from ..core.pricing import (
    calculate_booking_breakdown,
    calculate_line_item_total,
)

router = APIRouter()


def _gen_code() -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "DZ-" + "".join(secrets.choice(alphabet) for _ in range(8))


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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    venue: Venue = db.get(Venue, payload.venue_id)
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")

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
        user_id=current_user.id,
        date=payload.date,
        start_time=payload.start_time,
        end_time=end_time,
        status=BookingStatus.confirmed,
        total_price=breakdown["total"],
        confirmation_code=code,
        notes=payload.notes,
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

    result = BookingOut.model_validate(booking)
    result.price_breakdown = PriceBreakdown(**breakdown)
    return result


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
    return bookings


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
    return booking
