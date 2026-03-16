"""
Tests for pricing calculations – venue rate, add-ons, tables, rooms, favors.
"""
import pytest
from unittest.mock import MagicMock

from app.core.pricing import (
    calculate_line_item_total,
    calculate_foodcourt_subtotal,
    calculate_extra_rooms_subtotal,
    calculate_booking_breakdown,
)
from app.models import Venue, TableRateType


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def venue_fixed_table():
    """Venue with fixed-per-event table rate."""
    v = MagicMock(spec=Venue)
    v.base_hourly_rate = 1500.0
    v.buffer_minutes = 30
    v.included_rooms_count = 1
    v.extra_room_hourly_rate = 500.0
    v.foodcourt_table_rate_type = TableRateType.fixed_per_event
    v.foodcourt_table_rate = 300.0
    return v


@pytest.fixture
def venue_hourly_table():
    """Venue with per-hour table rate."""
    v = MagicMock(spec=Venue)
    v.base_hourly_rate = 1500.0
    v.buffer_minutes = 30
    v.included_rooms_count = 1
    v.extra_room_hourly_rate = 500.0
    v.foodcourt_table_rate_type = TableRateType.per_hour
    v.foodcourt_table_rate = 200.0
    return v


# ---------------------------------------------------------------------------
# Line item pricing
# ---------------------------------------------------------------------------

class TestLineItemPricing:
    def test_fixed_price_ignores_quantity_and_duration(self):
        assert calculate_line_item_total(2500.0, "fixed", 1.0, 3.0) == 2500.0
        assert calculate_line_item_total(2500.0, "fixed", 5.0, 3.0) == 2500.0  # qty ignored

    def test_per_hour_price(self):
        assert calculate_line_item_total(800.0, "per_hour", 1.0, 3.0) == 2400.0

    def test_per_unit_price(self):
        assert calculate_line_item_total(150.0, "per_unit", 5.0, 3.0) == 750.0

    def test_per_unit_fractional(self):
        assert calculate_line_item_total(49.0, "per_unit", 10.0, 2.0) == 490.0


# ---------------------------------------------------------------------------
# Food court table pricing
# ---------------------------------------------------------------------------

class TestFoodCourtPricing:
    def test_fixed_per_event_zero_tables(self, venue_fixed_table):
        assert calculate_foodcourt_subtotal(venue_fixed_table, 0, 3.0) == 0.0

    def test_fixed_per_event_one_table(self, venue_fixed_table):
        assert calculate_foodcourt_subtotal(venue_fixed_table, 1, 3.0) == 300.0

    def test_fixed_per_event_multiple_tables(self, venue_fixed_table):
        assert calculate_foodcourt_subtotal(venue_fixed_table, 4, 3.0) == 1200.0

    def test_per_hour_table_rate(self, venue_hourly_table):
        # 3 tables, 4 hours, 200/hr → 3*4*200 = 2400
        assert calculate_foodcourt_subtotal(venue_hourly_table, 3, 4.0) == 2400.0

    def test_per_hour_table_zero_tables(self, venue_hourly_table):
        assert calculate_foodcourt_subtotal(venue_hourly_table, 0, 4.0) == 0.0


# ---------------------------------------------------------------------------
# Extra rooms pricing
# ---------------------------------------------------------------------------

class TestExtraRoomsPricing:
    def test_zero_extra_rooms(self, venue_fixed_table):
        assert calculate_extra_rooms_subtotal(venue_fixed_table, 0, 3.0) == 0.0

    def test_one_extra_room(self, venue_fixed_table):
        # 1 extra room × ₹500/hr × 3h = ₹1500
        assert calculate_extra_rooms_subtotal(venue_fixed_table, 1, 3.0) == 1500.0

    def test_two_extra_rooms(self, venue_fixed_table):
        # 2 rooms × 500 × 4h = 4000
        assert calculate_extra_rooms_subtotal(venue_fixed_table, 2, 4.0) == 4000.0


# ---------------------------------------------------------------------------
# Full booking breakdown
# ---------------------------------------------------------------------------

class TestBookingBreakdown:
    def test_basic_booking_no_extras(self, venue_fixed_table):
        breakdown = calculate_booking_breakdown(
            venue=venue_fixed_table,
            duration_hours=3.0,
            line_items_data=[],
            foodcourt_tables_count=0,
            extra_rooms_count=0,
        )
        assert breakdown["venue_subtotal"] == 4500.0
        assert breakdown["addons_subtotal"] == 0.0
        assert breakdown["foodcourt_subtotal"] == 0.0
        assert breakdown["extra_rooms_subtotal"] == 0.0
        assert breakdown["favors_subtotal"] == 0.0
        assert breakdown["total"] == 4500.0

    def test_booking_with_all_extras(self, venue_fixed_table):
        line_items = [
            {"item_type": "service_addon", "line_total": 3500.0},   # Magic show
            {"item_type": "service_addon", "line_total": 2400.0},   # Photography 800/hr × 3h
            {"item_type": "favor_essential", "line_total": 750.0},  # Balloons 150×5
            {"item_type": "favor_essential", "line_total": 490.0},  # Return gifts 49×10
        ]
        breakdown = calculate_booking_breakdown(
            venue=venue_fixed_table,
            duration_hours=3.0,
            line_items_data=line_items,
            foodcourt_tables_count=2,
            extra_rooms_count=1,
        )
        assert breakdown["venue_subtotal"] == 4500.0           # 1500 × 3
        assert breakdown["addons_subtotal"] == 5900.0          # 3500+2400
        assert breakdown["foodcourt_subtotal"] == 600.0        # 300×2 (fixed/event)
        assert breakdown["extra_rooms_subtotal"] == 1500.0     # 500×1×3
        assert breakdown["favors_subtotal"] == 1240.0          # 750+490
        assert breakdown["total"] == 13740.0                   # sum of all

    def test_breakdown_buffer_info(self, venue_fixed_table):
        breakdown = calculate_booking_breakdown(venue_fixed_table, 2.0, [])
        assert breakdown["buffer_minutes"] == 30
        assert breakdown["duration_hours"] == 2.0

    def test_minimum_duration_pricing(self, venue_fixed_table):
        breakdown = calculate_booking_breakdown(
            venue=venue_fixed_table,
            duration_hours=2.0,
            line_items_data=[],
        )
        assert breakdown["venue_subtotal"] == 3000.0  # 1500 × 2
        assert breakdown["total"] == 3000.0
