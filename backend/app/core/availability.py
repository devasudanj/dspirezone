"""
Availability computation utilities.
"""
from datetime import date, time, datetime, timedelta
from typing import List, Tuple

from sqlalchemy.orm import Session

from ..models import (
    Venue, AvailabilityRule, BlackoutDate, Booking, BookingStatus
)


def _to_dt(d: date, t: time) -> datetime:
    """Combine date and time into a datetime (no tz)."""
    return datetime.combine(d, t)


def check_overlap(
    new_start: time,
    new_end: time,
    existing_start: time,
    existing_end: time,
    buffer_minutes: int,
) -> bool:
    """
    Returns True if new booking [new_start, new_end) overlaps with
    existing booking [existing_start, existing_end + buffer).
    All times are on the same date.
    """
    ref = date(2000, 1, 1)
    ns = _to_dt(ref, new_start)
    ne = _to_dt(ref, new_end)
    es = _to_dt(ref, existing_start)
    ee = _to_dt(ref, existing_end) + timedelta(minutes=buffer_minutes)
    return ns < ee and ne > es


def get_available_slots(
    db: Session,
    venue_id: int,
    booking_date: date,
    duration_hours: float = 2.0,
    slot_interval_minutes: int = 30,
) -> Tuple[List[time], bool, str | None]:
    """
    Returns (available_time_slots, is_blackout, blackout_reason).
    """
    venue = db.get(Venue, venue_id)
    if not venue:
        return [], False, None

    # Check blackout
    blackout = (
        db.query(BlackoutDate)
        .filter(BlackoutDate.venue_id == venue_id, BlackoutDate.date == booking_date)
        .first()
    )
    if blackout:
        return [], True, blackout.reason

    # Availability rules for day_of_week
    day_of_week = booking_date.weekday()  # 0=Monday, 6=Sunday
    rules = (
        db.query(AvailabilityRule)
        .filter(
            AvailabilityRule.venue_id == venue_id,
            AvailabilityRule.day_of_week == day_of_week,
        )
        .all()
    )
    # Backward-compat: some data may use 0=Sunday ... 6=Saturday.
    if not rules:
        sunday_based_day = (day_of_week + 1) % 7
        rules = (
            db.query(AvailabilityRule)
            .filter(
                AvailabilityRule.venue_id == venue_id,
                AvailabilityRule.day_of_week == sunday_based_day,
            )
            .all()
        )
    if not rules:
        return [], False, None

    # Existing bookings for that date (active bookings only)
    existing = (
        db.query(Booking)
        .filter(
            Booking.venue_id == venue_id,
            Booking.date == booking_date,
            Booking.status == BookingStatus.confirmed,
        )
        .all()
    )

    buffer_minutes = venue.buffer_minutes
    duration_td = timedelta(hours=duration_hours)
    slot_td = timedelta(minutes=slot_interval_minutes)
    ref = date(2000, 1, 1)

    available: List[time] = []

    for rule in rules:
        slot_dt = _to_dt(ref, rule.start_time)
        window_end = _to_dt(ref, rule.end_time)

        while slot_dt + duration_td <= window_end:
            slot_end_dt = slot_dt + duration_td
            slot_start_time = slot_dt.time()
            slot_end_time = slot_end_dt.time()

            is_free = True
            for bk in existing:
                if check_overlap(
                    slot_start_time, slot_end_time,
                    bk.start_time, bk.end_time,
                    buffer_minutes,
                ):
                    is_free = False
                    break

            if is_free:
                available.append(slot_start_time)

            slot_dt += slot_td

    return sorted(set(available)), False, None


def is_slot_available(
    db: Session,
    venue_id: int,
    booking_date: date,
    start_t: time,
    end_t: time,
    exclude_booking_id: int | None = None,
) -> bool:
    """Check if a specific [start_t, end_t] slot is available (no overlap)."""
    venue = db.get(Venue, venue_id)
    if not venue:
        return False

    # Blackout?
    blackout = (
        db.query(BlackoutDate)
        .filter(BlackoutDate.venue_id == venue_id, BlackoutDate.date == booking_date)
        .first()
    )
    if blackout:
        return False

    existing = (
        db.query(Booking)
        .filter(
            Booking.venue_id == venue_id,
            Booking.date == booking_date,
            Booking.status == BookingStatus.confirmed,
        )
        .all()
    )

    for bk in existing:
        if exclude_booking_id and bk.id == exclude_booking_id:
            continue
        if check_overlap(start_t, end_t, bk.start_time, bk.end_time, venue.buffer_minutes):
            return False

    return True
