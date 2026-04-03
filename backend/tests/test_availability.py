"""
Tests for availability logic and booking overlap / buffer rules.
"""
import pytest
from datetime import date, time, timedelta

from app.core.availability import check_overlap, get_available_slots
from app.database import Base
from app.models import (
    Venue, AvailabilityRule, Booking, BookingStatus,
    TableRateType
)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

TEST_DB_URL = "sqlite:///:memory:"


@pytest.fixture(scope="function")
def db():
    engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def venue(db):
    v = Venue(
        name="Test Venue",
        base_hourly_rate=1500.0,
        min_hours=2,
        buffer_minutes=30,
        timezone="Asia/Kolkata",
        included_rooms_count=1,
        extra_room_hourly_rate=500.0,
        foodcourt_table_rate_type=TableRateType.fixed_per_event,
        foodcourt_table_rate=300.0,
    )
    db.add(v)
    # Mon-Sun availability: 09:00 – 21:00
    for d in range(7):
        db.add(AvailabilityRule(
            venue_id=1,  # will be 1 since this is the first record
            day_of_week=d,
            start_time=time(9, 0),
            end_time=time(21, 0),
        ))
    db.commit()
    db.refresh(v)
    return v


# ---------------------------------------------------------------------------
# check_overlap unit tests
# ---------------------------------------------------------------------------

class TestCheckOverlap:
    def test_no_overlap_before(self):
        """New booking ends before the pre-buffer zone starts."""
        # existing: 12:00-14:00 with 30-min buffer → blocked from 11:30 to 14:30
        # new: 10:00-11:30 → ends exactly at pre-buffer edge → allowed
        assert not check_overlap(time(10, 0), time(11, 30), time(12, 0), time(14, 0), 30)

    def test_no_overlap_after_buffer(self):
        """New booking starts exactly after post-buffer period."""
        # existing: 10:00-12:00 + 30min buffer → blocked until 12:30
        # new: 12:30-14:30 → OK
        assert not check_overlap(time(12, 30), time(14, 30), time(10, 0), time(12, 0), 30)

    def test_overlap_within_buffer(self):
        """New booking starts inside the buffer zone of existing booking."""
        # existing: 10:00-12:00 + 30min buffer → blocked until 12:30
        # new: 12:15-14:15 → overlaps post-buffer
        assert check_overlap(time(12, 15), time(14, 15), time(10, 0), time(12, 0), 30)

    def test_overlap_pre_buffer(self):
        """New booking ends inside the pre-buffer zone (30 min before existing start)."""
        # existing: 10:00-12:00, pre-buffer starts at 09:30
        # new: 08:00-10:00 → ends at 10:00 which is > pre-buffer edge 09:30 → BLOCKED
        assert check_overlap(time(8, 0), time(10, 0), time(10, 0), time(12, 0), 30)

    def test_no_overlap_ends_at_pre_buffer_edge(self):
        """New booking ending exactly at pre-buffer edge (9:30) is allowed."""
        # existing: 10:00-12:00, 30-min buffer → pre-buffer edge = 09:30
        # new ends at exactly 09:30 → NOT overlapping (strict >)
        assert not check_overlap(time(7, 30), time(9, 30), time(10, 0), time(12, 0), 30)

    def test_direct_overlap(self):
        """New booking directly overlaps existing booking."""
        assert check_overlap(time(11, 0), time(13, 0), time(10, 0), time(12, 0), 30)

    def test_new_contains_existing(self):
        """New booking fully contains existing booking."""
        assert check_overlap(time(9, 0), time(15, 0), time(10, 0), time(12, 0), 30)

    def test_zero_buffer(self):
        """With zero buffer, booking ending at 12:00 allows new at 12:00."""
        assert not check_overlap(time(12, 0), time(14, 0), time(10, 0), time(12, 0), 0)

    def test_adjacent_bookings_with_buffer_just_enough(self):
        """Exactly 30-min gap → allowed."""
        assert not check_overlap(time(12, 30), time(14, 30), time(10, 0), time(12, 0), 30)

    def test_adjacent_bookings_with_buffer_one_min_short(self):
        """29-min gap after existing end → overlaps buffer."""
        assert check_overlap(time(12, 29), time(14, 29), time(10, 0), time(12, 0), 30)


# ---------------------------------------------------------------------------
# get_available_slots integration tests
# ---------------------------------------------------------------------------

class TestGetAvailableSlots:
    def test_slots_returned_for_open_day(self, db, venue):
        """All slots should be available for a date with no existing bookings."""
        test_date = date(2026, 4, 6)  # Monday
        slots, is_blackout, _ = get_available_slots(db, venue.id, test_date, 2.0)
        assert not is_blackout
        # 09:00 – 19:00 in 30-min steps with 2h duration → slots 09:00 to 19:00 start
        assert len(slots) > 0
        assert time(9, 0) in slots
        assert time(18, 30) in slots  # 18:30 + 2h = 20:30 <= 21:00 → valid
        # boundary: 19:00 + 2h = 21:00 = end of window → included (<=)
        assert time(19, 0) in slots

    def test_no_slots_on_blackout(self, db, venue):
        """Blackout date returns no slots and is_blackout=True."""
        from app.models import BlackoutDate
        bd = BlackoutDate(venue_id=venue.id, date=date(2026, 4, 7), reason="Maintenance")
        db.add(bd)
        db.commit()
        slots, is_blackout, reason = get_available_slots(db, venue.id, date(2026, 4, 7), 2.0)
        assert is_blackout
        assert reason == "Maintenance"
        assert slots == []

    def test_slot_blocked_by_existing_booking(self, db, venue):
        """Slot overlapping existing booking should be excluded."""
        import secrets, string
        code = "TEST" + "".join(secrets.choice(string.ascii_uppercase) for _ in range(4))
        bk = Booking(
            venue_id=venue.id, user_id=1,
            date=date(2026, 4, 8),
            start_time=time(10, 0), end_time=time(12, 0),
            status=BookingStatus.confirmed,
            total_price=3000.0,
            confirmation_code=code,
            rooms_included_count=1,
        )
        db.add(bk)
        db.commit()

        slots, _, _ = get_available_slots(db, venue.id, date(2026, 4, 8), 2.0)
        # 10:00 start overlaps directly
        assert time(10, 0) not in slots
        # 09:00 + 2h = 11:00 → 11:00 > 09:30 (pre-buffer edge) → overlap → blocked
        assert time(9, 0) not in slots
        # 10:30 start → 10:30 < 12:30 (post-buffer) → overlap → blocked
        assert time(10, 30) not in slots
        # 12:30 exactly after post-buffer → available
        assert time(12, 30) in slots

    def test_multiple_bookings_leave_gap(self, db, venue):
        """Two bookings with a gap between them should expose mid-day slots."""
        import secrets, string

        def make_booking(start, end, suffix):
            return Booking(
                venue_id=venue.id, user_id=1,
                date=date(2026, 4, 9),
                start_time=start, end_time=end,
                status=BookingStatus.confirmed,
                total_price=3000.0,
                confirmation_code="TST" + suffix,
                rooms_included_count=1,
            )

        db.add(make_booking(time(9, 0), time(11, 0), "A001"))
        db.add(make_booking(time(15, 0), time(17, 0), "A002"))
        db.commit()

        slots, _, _ = get_available_slots(db, venue.id, date(2026, 4, 9), 2.0)
        # 11:30 + 2h = 13:30 → 11:30 start is after buffer (11:30 >= 11:30) → available
        assert time(11, 30) in slots
        # 12:00 + 2h = 14:00 → 14:00 < 15:00 (next booking start) → available
        assert time(12, 0) in slots
        # 12:30 + 2h = 14:30 → 14:30 < 15:00 → available
        assert time(12, 30) in slots
        # 13:00 + 2h = 15:00 → 15:00 overlaps existing at 15:00 → NOT available
        assert time(13, 0) not in slots
