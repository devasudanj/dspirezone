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
    venue_id: int = Query(1),
    db: Session = Depends(get_db),
):
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
