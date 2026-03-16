"""
Seed script – populates the database with initial data.
Run once: python seed.py
"""
import os
import sys
from datetime import time

# Ensure backend package is importable
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal, engine, Base
from app.models import (
    Venue, CatalogItem, ItemType, PriceType, TableRateType,
    AvailabilityRule, User, UserRole
)
from app.core.security import get_password_hash


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # ----------------------------------------------------------------
        # Venue
        # ----------------------------------------------------------------
        if not db.query(Venue).first():
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

            # Availability rules: Mon-Fri 10am-9pm, Sat-Sun 9am-10pm
            weekday_rules = [
                AvailabilityRule(venue_id=venue.id, day_of_week=d,
                                 start_time=time(10, 0), end_time=time(21, 0))
                for d in range(0, 5)  # Mon-Fri
            ]
            weekend_rules = [
                AvailabilityRule(venue_id=venue.id, day_of_week=d,
                                 start_time=time(9, 0), end_time=time(22, 0))
                for d in [5, 6]  # Sat, Sun
            ]
            db.add_all(weekday_rules + weekend_rules)
            print("✓ Venue + availability rules created")

        # ----------------------------------------------------------------
        # Catalog items – Service add-ons
        # ----------------------------------------------------------------
        addon_items = [
            dict(
                name="Magic Show",
                description="60-minute professional magic show for all ages. Guaranteed fun!",
                type=ItemType.service_addon,
                price_type=PriceType.fixed,
                unit_label="show",
                price=3500.0,
                sort_order=1,
            ),
            dict(
                name="Photography Package",
                description="Professional photographer for the full duration of your event.",
                type=ItemType.service_addon,
                price_type=PriceType.per_hour,
                unit_label="hour",
                price=800.0,
                sort_order=2,
            ),
            dict(
                name="Decoration Package – Basic",
                description="Balloon arches, table centrepieces, and colourful streamers.",
                type=ItemType.service_addon,
                price_type=PriceType.fixed,
                unit_label="package",
                price=2500.0,
                sort_order=3,
            ),
            dict(
                name="Decoration Package – Premium",
                description="Full floral & balloon setup, LED backdrop, neon sign rental.",
                type=ItemType.service_addon,
                price_type=PriceType.fixed,
                unit_label="package",
                price=5500.0,
                sort_order=4,
            ),
            dict(
                name="Catering – Snacks & Beverages",
                description="Curated finger-food menu + cold beverages for up to 30 guests.",
                type=ItemType.service_addon,
                price_type=PriceType.fixed,
                unit_label="package",
                price=4000.0,
                sort_order=5,
            ),
            dict(
                name="DJ & Sound System",
                description="Professional DJ with PA system and playlist of your choice.",
                type=ItemType.service_addon,
                price_type=PriceType.per_hour,
                unit_label="hour",
                price=1200.0,
                sort_order=6,
            ),
            dict(
                name="Video Slideshow Setup",
                description="Pre-event photo/video slideshow projected on the main screen.",
                type=ItemType.service_addon,
                price_type=PriceType.fixed,
                unit_label="setup",
                price=1000.0,
                sort_order=7,
            ),
            dict(
                name="Valet Parking Service",
                description="Up to 15 cars can be parked. Charged at Rs. 1500/hr for the full event duration.",
                type=ItemType.service_addon,
                price_type=PriceType.per_hour,
                unit_label="hour",
                price=1500.0,
                sort_order=8,
            ),
        ]

        # ----------------------------------------------------------------
        # Catalog items – Favors & Essentials
        # ----------------------------------------------------------------
        favor_items = [
            dict(
                name="Balloon Bouquet",
                description="Group of 5 helium latex balloons in your chosen colour.",
                type=ItemType.favor_essential,
                price_type=PriceType.per_unit,
                unit_label="bouquet",
                price=150.0,
                sort_order=10,
            ),
            dict(
                name="Scented Candles (Pack of 6)",
                description="Premium soy-wax scented candles for ambience.",
                type=ItemType.favor_essential,
                price_type=PriceType.per_unit,
                unit_label="pack",
                price=199.0,
                sort_order=11,
            ),
            dict(
                name="Return Gift Bags",
                description="Personalised kraft paper gift bags for guests.",
                type=ItemType.favor_essential,
                price_type=PriceType.per_unit,
                unit_label="bag",
                price=49.0,
                sort_order=12,
            ),
            dict(
                name="Disposable Plates & Cups (10-set)",
                description="Eco-friendly sugarcane fibre plates + cups – biodegradable.",
                type=ItemType.favor_essential,
                price_type=PriceType.per_unit,
                unit_label="set",
                price=120.0,
                sort_order=13,
            ),
            dict(
                name="Party Hats (Pack of 10)",
                description="Glitter party hats in assorted colours.",
                type=ItemType.favor_essential,
                price_type=PriceType.per_unit,
                unit_label="pack",
                price=89.0,
                sort_order=14,
            ),
            dict(
                name="Backdrop Banner (A1 size)",
                description="Customisable printed backdrop banner for photo moments.",
                type=ItemType.favor_essential,
                price_type=PriceType.per_unit,
                unit_label="banner",
                price=499.0,
                sort_order=15,
            ),
            dict(
                name="Table Cloths (Pack of 4)",
                description="Premium fabric rectangular table cloths in white or theme colour.",
                type=ItemType.favor_essential,
                price_type=PriceType.per_unit,
                unit_label="pack",
                price=349.0,
                sort_order=16,
            ),
            dict(
                name="LED Fairy Lights (5m)",
                description="Warm-white LED string lights for that magical glow.",
                type=ItemType.favor_essential,
                price_type=PriceType.per_unit,
                unit_label="roll",
                price=249.0,
                sort_order=17,
            ),
        ]

        existing_names = {c.name for c in db.query(CatalogItem).all()}
        for item_data in addon_items + favor_items:
            if item_data["name"] not in existing_names:
                db.add(CatalogItem(**item_data))

        print("✓ Catalog items seeded")

        # ----------------------------------------------------------------
        # Admin user
        # ----------------------------------------------------------------
        admin_email = "admin@dspirezone.com"
        if not db.query(User).filter(User.email == admin_email).first():
            admin = User(
                name="Admin",
                email=admin_email,
                password_hash=get_password_hash("admin@DspireZone2026!"),
                role=UserRole.admin,
            )
            db.add(admin)
            print(f"✓ Admin user created: {admin_email} / admin@DspireZone2026!")

        db.commit()
        print("\n✅ Seed completed successfully!")

    except Exception as exc:
        db.rollback()
        print(f"❌ Seed failed: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
