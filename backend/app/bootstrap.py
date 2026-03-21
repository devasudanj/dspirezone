from datetime import time

from sqlalchemy.orm import Session

from .database import SessionLocal
from .models import (
    AvailabilityRule,
    CatalogItem,
    ItemType,
    PriceType,
    TableRateType,
    Venue,
)


def ensure_baseline_data() -> None:
    db: Session = SessionLocal()
    try:
        venue = db.query(Venue).first()
        if not venue:
            venue = Venue(
                name="DspireZone Event Hall",
                description=(
                    "A stunning, fully-equipped event venue in the heart of New Perungalathur, "
                    "Chennai. Perfect for birthdays, baby showers, corporate gatherings, and "
                    "intimate celebrations."
                ),
                address="123 Celebration Street, New Perungalathur, Chennai – 600 063, Tamil Nadu",
                base_hourly_rate=1500.0,
                min_hours=2,
                buffer_minutes=30,
                timezone="Asia/Kolkata",
                included_rooms_count=1,
                extra_room_hourly_rate=500.0,
                foodcourt_table_rate_type=TableRateType.fixed_per_event,
                foodcourt_table_rate=300.0,
            )
            db.add(venue)
            db.flush()

        if not venue.availability_rules:
            weekday_rules = [
                AvailabilityRule(venue_id=venue.id, day_of_week=day, start_time=time(10, 0), end_time=time(21, 0))
                for day in range(0, 5)
            ]
            weekend_rules = [
                AvailabilityRule(venue_id=venue.id, day_of_week=day, start_time=time(9, 0), end_time=time(22, 0))
                for day in (5, 6)
            ]
            db.add_all(weekday_rules + weekend_rules)

        baseline_items = [
            {
                "name": "Magic Show",
                "description": "60-minute professional magic show for all ages. Guaranteed fun!",
                "type": ItemType.service_addon,
                "price_type": PriceType.fixed,
                "unit_label": "show",
                "price": 3500.0,
                "sort_order": 1,
            },
            {
                "name": "Photography Package",
                "description": "Professional photographer for the full duration of your event.",
                "type": ItemType.service_addon,
                "price_type": PriceType.per_hour,
                "unit_label": "hour",
                "price": 800.0,
                "sort_order": 2,
            },
            {
                "name": "Decoration Package – Basic",
                "description": "Balloon arches, table centrepieces, and colourful streamers.",
                "type": ItemType.service_addon,
                "price_type": PriceType.fixed,
                "unit_label": "package",
                "price": 2500.0,
                "sort_order": 3,
            },
            {
                "name": "Decoration Package – Premium",
                "description": "Full floral & balloon setup, LED backdrop, neon sign rental.",
                "type": ItemType.service_addon,
                "price_type": PriceType.fixed,
                "unit_label": "package",
                "price": 5500.0,
                "sort_order": 4,
            },
            {
                "name": "Catering – Snacks & Beverages",
                "description": "Curated finger-food menu + cold beverages for up to 30 guests.",
                "type": ItemType.service_addon,
                "price_type": PriceType.fixed,
                "unit_label": "package",
                "price": 4000.0,
                "sort_order": 5,
            },
            {
                "name": "DJ & Sound System",
                "description": "Professional DJ with PA system and playlist of your choice.",
                "type": ItemType.service_addon,
                "price_type": PriceType.per_hour,
                "unit_label": "hour",
                "price": 1200.0,
                "sort_order": 6,
            },
            {
                "name": "Video Slideshow Setup",
                "description": "Pre-event photo/video slideshow projected on the main screen.",
                "type": ItemType.service_addon,
                "price_type": PriceType.fixed,
                "unit_label": "setup",
                "price": 1000.0,
                "sort_order": 7,
            },
            {
                "name": "Valet Parking Service",
                "description": "Up to 15 cars can be parked. Charged at Rs. 1500/hr for the full event duration.",
                "type": ItemType.service_addon,
                "price_type": PriceType.per_hour,
                "unit_label": "hour",
                "price": 1500.0,
                "sort_order": 8,
            },
            {
                "name": "Balloon Bouquet",
                "description": "Group of 5 helium latex balloons in your chosen colour.",
                "type": ItemType.favor_essential,
                "price_type": PriceType.per_unit,
                "unit_label": "bouquet",
                "price": 150.0,
                "sort_order": 10,
            },
            {
                "name": "Scented Candles (Pack of 6)",
                "description": "Premium soy-wax scented candles for ambience.",
                "type": ItemType.favor_essential,
                "price_type": PriceType.per_unit,
                "unit_label": "pack",
                "price": 199.0,
                "sort_order": 11,
            },
            {
                "name": "Return Gift Bags",
                "description": "Personalised kraft paper gift bags for guests.",
                "type": ItemType.favor_essential,
                "price_type": PriceType.per_unit,
                "unit_label": "bag",
                "price": 49.0,
                "sort_order": 12,
            },
            {
                "name": "Disposable Plates & Cups (10-set)",
                "description": "Eco-friendly sugarcane fibre plates + cups – biodegradable.",
                "type": ItemType.favor_essential,
                "price_type": PriceType.per_unit,
                "unit_label": "set",
                "price": 120.0,
                "sort_order": 13,
            },
            {
                "name": "Party Hats (Pack of 10)",
                "description": "Glitter party hats in assorted colours.",
                "type": ItemType.favor_essential,
                "price_type": PriceType.per_unit,
                "unit_label": "pack",
                "price": 89.0,
                "sort_order": 14,
            },
            {
                "name": "Backdrop Banner (A1 size)",
                "description": "Customisable printed backdrop banner for photo moments.",
                "type": ItemType.favor_essential,
                "price_type": PriceType.per_unit,
                "unit_label": "banner",
                "price": 499.0,
                "sort_order": 15,
            },
            {
                "name": "Table Cloths (Pack of 4)",
                "description": "Premium fabric rectangular table cloths in white or theme colour.",
                "type": ItemType.favor_essential,
                "price_type": PriceType.per_unit,
                "unit_label": "pack",
                "price": 349.0,
                "sort_order": 16,
            },
            {
                "name": "LED Fairy Lights (5m)",
                "description": "Warm-white LED string lights for that magical glow.",
                "type": ItemType.favor_essential,
                "price_type": PriceType.per_unit,
                "unit_label": "roll",
                "price": 249.0,
                "sort_order": 17,
            },
        ]

        existing_names = {item.name for item in db.query(CatalogItem).all()}
        for item_data in baseline_items:
            if item_data["name"] not in existing_names:
                db.add(CatalogItem(**item_data))

        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()