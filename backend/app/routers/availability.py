from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Venue, Booking, BookingStatus, AvailabilityRule
from ..schemas import AvailableSlotsResponse
from ..core.availability import get_available_slots
from ..core.cal_com import get_cal_available_times, is_cal_booking_cancelled

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

    # Cal.com is the primary source of truth for open/busy windows and handles
    # the AFTER-event buffer correctly.  However, it does NOT reliably apply the
    # BEFORE-event buffer when checking whether a new slot would overlap — e.g.
    # a slot that ends exactly at the pre-buffer boundary (booking_start - 30min)
    # is still returned as available.
    #
    # We therefore fetch cal.com slots and then strip any slot whose end time
    # falls inside the pre-event buffer of an existing booking:
    #   slot_end > booking_start - buffer_minutes  AND  slot_start < booking_start
    #
    # We deliberately do NOT re-apply the post-event buffer here because:
    #   a) cal.com handles after-buffers correctly, and
    #   b) local DB booking end times may differ from cal.com (duration mismatch),
    #      which would cause over-blocking.
    cal_slots = get_cal_available_times(booking_date, int(duration_hours * 60))
    if cal_slots is not None:
        venue = db.get(Venue, venue_id)
        buffer_minutes = venue.buffer_minutes if venue else 30
        buffer_td = timedelta(minutes=buffer_minutes)
        duration_td = timedelta(hours=duration_hours)
        ref = date(2000, 1, 1)

        existing_raw = (
            db.query(Booking)
            .filter(
                Booking.venue_id == venue_id,
                Booking.date == booking_date,
                Booking.status == BookingStatus.confirmed,
            )
            .all()
        )

        # Auto-cancel any local confirmed bookings that are already cancelled
        # in cal.com (e.g. cancelled directly via cal.com UI/admin without
        # going through the local admin panel).
        existing = []
        for bk in existing_raw:
            if bk.cal_booking_uid and is_cal_booking_cancelled(bk.cal_booking_uid):
                bk.status = BookingStatus.cancelled
                bk.notes = (bk.notes or "") + "\n[Auto-cancelled: synced from cal.com]"
                db.flush()
            else:
                existing.append(bk)

        # Determine the venue's closing time for this day so we can drop
        # cal.com slots whose end time would exceed it.
        day_of_week = booking_date.weekday()
        day_rules = (
            db.query(AvailabilityRule)
            .filter(
                AvailabilityRule.venue_id == venue_id,
                AvailabilityRule.day_of_week == day_of_week,
            )
            .all()
        )
        max_end_dt = None
        for rule in day_rules:
            rule_end_dt = datetime.combine(ref, rule.end_time)
            if max_end_dt is None or rule_end_dt > max_end_dt:
                max_end_dt = rule_end_dt
        if max_end_dt is None:
            max_end_dt = datetime.combine(ref, datetime.strptime("21:00", "%H:%M").time())

        filtered = []
        for slot_t in cal_slots:
            slot_start_dt = datetime.combine(ref, slot_t)
            slot_end_dt = slot_start_dt + duration_td

            # Drop slots that would extend beyond the venue's closing time.
            if slot_end_dt > max_end_dt:
                continue

            blocked = False
            for bk in existing:
                bk_start_dt = datetime.combine(ref, bk.start_time)
                bk_buffered_start = bk_start_dt - buffer_td
                # Only apply pre-event buffer: block slots that end inside the
                # buffer zone of an UPCOMING booking.
                if slot_start_dt < bk_start_dt and slot_end_dt > bk_buffered_start:
                    blocked = True
                    break
            if not blocked:
                filtered.append(slot_t)

        return AvailableSlotsResponse(
            date=booking_date,
            duration_hours=duration_hours,
            slots=sorted(set(t.strftime("%H:%M") for t in filtered)),
            is_blackout=False,
            blackout_reason=None,
        )

    # Fall back to local DB if cal.com is unavailable / not configured.
    local_slots, is_blackout, blackout_reason = get_available_slots(
        db, venue_id, booking_date, duration_hours
    )
    return AvailableSlotsResponse(
        date=booking_date,
        duration_hours=duration_hours,
        slots=[t.strftime("%H:%M") for t in local_slots],
        is_blackout=is_blackout,
        blackout_reason=blackout_reason,
    )
