from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (
    Booking, BookingStatus, CatalogItem, Venue,
    AvailabilityRule, BlackoutDate
)
from ..schemas import (
    BookingOut, BookingStatusUpdate, BookingOutWithPayments,
    CatalogItemCreate, CatalogItemUpdate, CatalogItemOut,
    VenueOut, VenueUpdate,
    AvailabilityRuleCreate, AvailabilityRuleOut,
    BlackoutDateCreate, BlackoutDateOut,
)
from ..deps import get_admin_user
from ..models import User
from .bookings import serialize_booking, serialize_booking_with_payments
from ..core.email import send_booking_reminder_email
from ..core.cal_com import cancel_cal_booking

router = APIRouter()


# ---------------------------------------------------------------------------
# Venue
# ---------------------------------------------------------------------------

@router.get("/venue", response_model=VenueOut)
def admin_get_venue(db: Session = Depends(get_db), _: User = Depends(get_admin_user)):
    venue = db.query(Venue).first()
    if not venue:
        raise HTTPException(404, "Venue not configured")
    return venue


@router.patch("/venue", response_model=VenueOut)
def admin_update_venue(
    payload: VenueUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    venue = db.query(Venue).first()
    if not venue:
        raise HTTPException(404, "Venue not configured")
    for field, val in payload.model_dump(exclude_none=True).items():
        setattr(venue, field, val)
    db.commit()
    db.refresh(venue)
    return venue


# ---------------------------------------------------------------------------
# Catalog Items
# ---------------------------------------------------------------------------

@router.get("/catalog", response_model=List[CatalogItemOut])
def admin_list_catalog(
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    return db.query(CatalogItem).order_by(CatalogItem.sort_order, CatalogItem.id).all()


@router.post("/catalog", response_model=CatalogItemOut, status_code=status.HTTP_201_CREATED)
def admin_create_catalog_item(
    payload: CatalogItemCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    item = CatalogItem(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/catalog/{item_id}", response_model=CatalogItemOut)
def admin_update_catalog_item(
    item_id: int,
    payload: CatalogItemUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    item = db.get(CatalogItem, item_id)
    if not item:
        raise HTTPException(404, "Item not found")
    for field, val in payload.model_dump(exclude_none=True).items():
        setattr(item, field, val)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/catalog/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_catalog_item(
    item_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    item = db.get(CatalogItem, item_id)
    if not item:
        raise HTTPException(404, "Item not found")
    db.delete(item)
    db.commit()


# ---------------------------------------------------------------------------
# Availability Rules
# ---------------------------------------------------------------------------

@router.get("/availability-rules", response_model=List[AvailabilityRuleOut])
def admin_list_rules(
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    venue = db.query(Venue).first()
    if not venue:
        return []
    return venue.availability_rules


@router.post("/availability-rules", response_model=AvailabilityRuleOut, status_code=201)
def admin_create_rule(
    payload: AvailabilityRuleCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    venue = db.query(Venue).first()
    if not venue:
        raise HTTPException(404, "Venue not configured")
    rule = AvailabilityRule(venue_id=venue.id, **payload.model_dump())
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.delete("/availability-rules/{rule_id}", status_code=204)
def admin_delete_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    rule = db.get(AvailabilityRule, rule_id)
    if not rule:
        raise HTTPException(404, "Rule not found")
    db.delete(rule)
    db.commit()


# ---------------------------------------------------------------------------
# Blackout Dates
# ---------------------------------------------------------------------------

@router.get("/blackouts", response_model=List[BlackoutDateOut])
def admin_list_blackouts(
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    venue = db.query(Venue).first()
    if not venue:
        return []
    return venue.blackout_dates


@router.post("/blackouts", response_model=BlackoutDateOut, status_code=201)
def admin_create_blackout(
    payload: BlackoutDateCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    venue = db.query(Venue).first()
    if not venue:
        raise HTTPException(404, "Venue not configured")
    bd = BlackoutDate(venue_id=venue.id, **payload.model_dump())
    db.add(bd)
    db.commit()
    db.refresh(bd)
    return bd


@router.delete("/blackouts/{bd_id}", status_code=204)
def admin_delete_blackout(
    bd_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    bd = db.get(BlackoutDate, bd_id)
    if not bd:
        raise HTTPException(404, "Blackout not found")
    db.delete(bd)
    db.commit()


# ---------------------------------------------------------------------------
# Bookings
# ---------------------------------------------------------------------------

@router.get("/bookings", response_model=List[BookingOut])
def admin_list_bookings(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    q = db.query(Booking)
    if status_filter:
        q = q.filter(Booking.status == status_filter)
    bookings = q.order_by(Booking.created_at.desc()).all()
    return [serialize_booking(booking) for booking in bookings]


@router.patch("/bookings/{booking_id}/status", response_model=BookingOut)
def admin_update_booking_status(
    booking_id: int,
    payload: BookingStatusUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    booking = db.get(Booking, booking_id)
    if not booking:
        raise HTTPException(404, "Booking not found")
    old_status = booking.status
    booking.status = payload.status
    db.commit()
    db.refresh(booking)
    # If transitioning to cancelled, also cancel in cal.com
    if payload.status == BookingStatus.cancelled and old_status != BookingStatus.cancelled:
        if booking.cal_booking_uid:
            cancel_cal_booking(booking.cal_booking_uid, reason="Cancelled by admin")
    return serialize_booking(booking)


@router.get("/bookings/{booking_id}", response_model=BookingOutWithPayments)
def admin_get_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    booking = db.get(Booking, booking_id)
    if not booking:
        raise HTTPException(404, "Booking not found")
    return serialize_booking_with_payments(booking)


from pydantic import BaseModel as _BaseModel, EmailStr as _EmailStr

class _AltContactUpdate(_BaseModel):
    alt_email: Optional[str] = None
    alt_phone: Optional[str] = None


@router.patch("/bookings/{booking_id}/alt-contact", response_model=BookingOutWithPayments)
def admin_update_alt_contact(
    booking_id: int,
    payload: _AltContactUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    """Update alternate email / phone for a booking (admin only)."""
    booking = db.get(Booking, booking_id)
    if not booking:
        raise HTTPException(404, "Booking not found")
    if payload.alt_email is not None:
        booking.alt_email = payload.alt_email.lower() if payload.alt_email else None
    if payload.alt_phone is not None:
        booking.alt_phone = payload.alt_phone or None
    db.commit()
    db.refresh(booking)
    return serialize_booking_with_payments(booking)


@router.post("/bookings/{booking_id}/resend-email", status_code=202)
def admin_resend_booking_email(
    booking_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    """Send (or resend) the booking details + modify-link email to the customer
    email and, if set, the alternate email address."""
    booking = db.get(Booking, booking_id)
    if not booking:
        raise HTTPException(404, "Booking not found")
    venue = db.get(Venue, booking.venue_id)
    if not venue:
        raise HTTPException(404, "Venue not found")

    from .bookings import serialize_booking as _sb
    booking_dict = _sb(booking).model_dump(mode="json")
    venue_dict = {"name": venue.name, "address": venue.address}

    extra: list[str] = []
    if booking.alt_email:
        extra.append(booking.alt_email)

    try:
        send_booking_reminder_email(booking_dict, venue_dict, extra, raise_on_error=True)
    except Exception as exc:
        raise HTTPException(500, f"Email send failed: {exc}")
    return {"message": "Email sent successfully"}
