from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Venue
from ..schemas import AvailableSlotsResponse
from ..core.availability import get_available_slots
from ..core.cal_com import get_cal_available_times

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

    local_slots, is_blackout, blackout_reason = get_available_slots(
        db, venue_id, booking_date, duration_hours
    )

    if is_blackout or not local_slots:
        return AvailableSlotsResponse(
            date=booking_date,
            duration_hours=duration_hours,
            slots=[],
            is_blackout=is_blackout,
            blackout_reason=blackout_reason,
        )

    # Cross-check with cal.com availability (if configured).
    # Only return slots that are open in BOTH local rules AND cal.com.
    duration_minutes = int(duration_hours * 60)
    cal_times = get_cal_available_times(booking_date, duration_minutes)

    if cal_times is not None:
        # Intersect: keep only locally-available slots that cal.com also shows open
        cal_times_set = {t.strftime("%H:%M") for t in cal_times}
        filtered = [t for t in local_slots if t.strftime("%H:%M") in cal_times_set]
    else:
        # cal.com unavailable — fall back to local availability only
        filtered = local_slots

    return AvailableSlotsResponse(
        date=booking_date,
        duration_hours=duration_hours,
        slots=[t.strftime("%H:%M") for t in filtered],
        is_blackout=is_blackout,
        blackout_reason=blackout_reason,
    )
