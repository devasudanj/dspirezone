from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (
    Booking, BookingStatus, CatalogItem, Venue,
    AvailabilityRule, BlackoutDate
)
from ..schemas import (
    BookingOut, BookingStatusUpdate,
    CatalogItemCreate, CatalogItemUpdate, CatalogItemOut,
    VenueOut, VenueUpdate,
    AvailabilityRuleCreate, AvailabilityRuleOut,
    BlackoutDateCreate, BlackoutDateOut,
)
from ..deps import get_admin_user
from ..models import User

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
    return q.order_by(Booking.created_at.desc()).all()


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
    booking.status = payload.status
    db.commit()
    db.refresh(booking)
    return booking
