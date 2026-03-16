"""
Pricing calculation utilities.
All monetary values are in INR (₹).
"""
from datetime import timedelta
from typing import List

from ..models import Venue, CatalogItem, PriceType, TableRateType


def calculate_duration_hours(start_time, end_time) -> float:
    """Calculate duration in hours between two time objects."""
    start_minutes = start_time.hour * 60 + start_time.minute
    end_minutes = end_time.hour * 60 + end_time.minute
    return (end_minutes - start_minutes) / 60.0


def calculate_line_item_total(
    price: float,
    price_type: str,
    quantity: float,
    duration_hours: float,
) -> float:
    """Calculate line item cost based on price type."""
    if price_type == PriceType.per_hour.value or price_type == "per_hour":
        return round(price * duration_hours, 2)
    elif price_type == PriceType.per_unit.value or price_type == "per_unit":
        return round(price * quantity, 2)
    else:  # fixed
        return round(price, 2)


def calculate_foodcourt_subtotal(
    venue: Venue,
    tables_count: int,
    duration_hours: float,
) -> float:
    if tables_count <= 0:
        return 0.0
    rt = venue.foodcourt_table_rate_type
    rate = venue.foodcourt_table_rate
    if rt == TableRateType.per_hour:
        return round(rate * tables_count * duration_hours, 2)
    else:  # fixed_per_event
        return round(rate * tables_count, 2)


def calculate_extra_rooms_subtotal(
    venue: Venue,
    extra_rooms_count: int,
    duration_hours: float,
) -> float:
    if extra_rooms_count <= 0:
        return 0.0
    return round(venue.extra_room_hourly_rate * extra_rooms_count * duration_hours, 2)


def calculate_booking_breakdown(
    venue: Venue,
    duration_hours: float,
    line_items_data: List[dict],  # [{"item_type": ..., "line_total": ...}]
    foodcourt_tables_count: int = 0,
    extra_rooms_count: int = 0,
) -> dict:
    """
    Returns a full price breakdown dict.

    line_items_data each must have keys: item_type, line_total
    """
    venue_subtotal = round(venue.base_hourly_rate * duration_hours, 2)

    addons_subtotal = sum(
        it.get("line_total", 0.0)
        for it in line_items_data
        if it.get("item_type") == "service_addon"
    )
    favors_subtotal = sum(
        it.get("line_total", 0.0)
        for it in line_items_data
        if it.get("item_type") == "favor_essential"
    )
    foodcourt_subtotal = calculate_foodcourt_subtotal(venue, foodcourt_tables_count, duration_hours)
    extra_rooms_subtotal = calculate_extra_rooms_subtotal(venue, extra_rooms_count, duration_hours)

    total = venue_subtotal + addons_subtotal + foodcourt_subtotal + extra_rooms_subtotal + favors_subtotal

    return {
        "venue_subtotal": round(venue_subtotal, 2),
        "addons_subtotal": round(addons_subtotal, 2),
        "foodcourt_subtotal": round(foodcourt_subtotal, 2),
        "extra_rooms_subtotal": round(extra_rooms_subtotal, 2),
        "favors_subtotal": round(favors_subtotal, 2),
        "total": round(total, 2),
        "duration_hours": duration_hours,
        "buffer_minutes": venue.buffer_minutes,
    }
