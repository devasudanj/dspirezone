from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Venue
from ..schemas import AvailableSlotsResponse
from ..core.availability import get_available_slots

router = APIRouter()


@router.get("/slots", response_model=AvailableSlotsResponse)
def available_slots(
    booking_date: date = Query(..., alias="date"),
    duration_hours: float = Query(2.0, ge=2.0),
    venue_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    if venue_id is None:
        first_venue = db.query(Venue.id).order_by(Venue.id.asc()).first()
        if not first_venue:
            return AvailableSlotsResponse(
                date=booking_date,
                duration_hours=duration_hours,
                slots=[],
                is_blackout=False,
                blackout_reason=None,
            )
        venue_id = int(first_venue[0])

    slots, is_blackout, blackout_reason = get_available_slots(
        db, venue_id, booking_date, duration_hours
    )
    return AvailableSlotsResponse(
        date=booking_date,
        duration_hours=duration_hours,
        slots=[t.strftime("%H:%M") for t in slots],
        is_blackout=is_blackout,
        blackout_reason=blackout_reason,
    )
