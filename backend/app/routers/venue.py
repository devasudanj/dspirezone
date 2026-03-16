from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Venue
from ..schemas import VenueOut

router = APIRouter()


def _get_venue(db: Session) -> Venue:
    venue = db.query(Venue).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not configured")
    return venue


@router.get("", response_model=VenueOut)
def get_venue(db: Session = Depends(get_db)):
    return _get_venue(db)


@router.get("/whats-included")
def whats_included(db: Session = Depends(get_db)):
    venue = _get_venue(db)
    return {
        "included_rooms_count": venue.included_rooms_count,
        "items": [
            {"label": f"{venue.included_rooms_count} private room(s) at no extra cost"},
            {"label": "Basic AV setup (projector, sound system)"},
            {"label": "Tables & chairs for up to 50 guests"},
            {"label": "Air conditioning"},
            {"label": "Free parking"},
            {"label": f"Min {venue.min_hours}h booking, {venue.buffer_minutes}min cleanup buffer after each event"},
        ],
    }
