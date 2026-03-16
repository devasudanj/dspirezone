import enum
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime,
    Date, Time, ForeignKey, Enum, Text
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .database import Base


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------

class UserRole(str, enum.Enum):
    user = "user"
    admin = "admin"


class BookingStatus(str, enum.Enum):
    draft = "draft"
    confirmed = "confirmed"
    cancelled = "cancelled"


class ItemType(str, enum.Enum):
    service_addon = "service_addon"
    favor_essential = "favor_essential"


class PriceType(str, enum.Enum):
    fixed = "fixed"
    per_hour = "per_hour"
    per_unit = "per_unit"


class TableRateType(str, enum.Enum):
    fixed_per_event = "fixed_per_event"
    per_hour = "per_hour"


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.user, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    bookings = relationship("Booking", back_populates="user")


class Venue(Base):
    __tablename__ = "venues"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    address = Column(String(500))
    base_hourly_rate = Column(Float, nullable=False, default=1500.0)
    min_hours = Column(Integer, default=2)
    buffer_minutes = Column(Integer, default=30)
    timezone = Column(String(50), default="Asia/Kolkata")
    # Room config
    included_rooms_count = Column(Integer, default=1)
    extra_room_hourly_rate = Column(Float, default=500.0)
    # Food court table pricing
    foodcourt_table_rate_type = Column(
        Enum(TableRateType), default=TableRateType.fixed_per_event
    )
    foodcourt_table_rate = Column(Float, default=300.0)

    availability_rules = relationship("AvailabilityRule", back_populates="venue", cascade="all, delete-orphan")
    blackout_dates = relationship("BlackoutDate", back_populates="venue", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="venue")


class CatalogItem(Base):
    __tablename__ = "catalog_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    type = Column(Enum(ItemType), nullable=False)
    price_type = Column(Enum(PriceType), default=PriceType.fixed, nullable=False)
    unit_label = Column(String(50), default="item")
    price = Column(Float, nullable=False)
    active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)

    booking_line_items = relationship("BookingLineItem", back_populates="catalog_item")


class AvailabilityRule(Base):
    __tablename__ = "availability_rules"

    id = Column(Integer, primary_key=True, index=True)
    venue_id = Column(Integer, ForeignKey("venues.id"), nullable=False)
    # 0=Monday … 6=Sunday  (Python weekday convention)
    day_of_week = Column(Integer, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)

    venue = relationship("Venue", back_populates="availability_rules")


class BlackoutDate(Base):
    __tablename__ = "blackout_dates"

    id = Column(Integer, primary_key=True, index=True)
    venue_id = Column(Integer, ForeignKey("venues.id"), nullable=False)
    date = Column(Date, nullable=False)
    reason = Column(String(500))

    venue = relationship("Venue", back_populates="blackout_dates")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    venue_id = Column(Integer, ForeignKey("venues.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    status = Column(Enum(BookingStatus), default=BookingStatus.draft, nullable=False)
    total_price = Column(Float, nullable=False)
    confirmation_code = Column(String(20), unique=True, nullable=False, index=True)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    # Room info
    rooms_included_count = Column(Integer, default=1)
    extra_rooms_count = Column(Integer, default=0)
    # Food court
    foodcourt_tables_count = Column(Integer, default=0)
    foodcourt_table_notes = Column(Text)

    user = relationship("User", back_populates="bookings")
    venue = relationship("Venue", back_populates="bookings")
    line_items = relationship("BookingLineItem", back_populates="booking", cascade="all, delete-orphan")


class BookingLineItem(Base):
    __tablename__ = "booking_line_items"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    catalog_item_id = Column(Integer, ForeignKey("catalog_items.id"), nullable=True)
    item_type = Column(String(50), nullable=False)
    item_name = Column(String(200))
    quantity = Column(Float, default=1.0)
    unit_price = Column(Float, nullable=False)
    price_type = Column(String(20))
    unit_label = Column(String(50))
    line_total = Column(Float, nullable=False)

    booking = relationship("Booking", back_populates="line_items")
    catalog_item = relationship("CatalogItem", back_populates="booking_line_items")


class VendorInquiry(Base):
    __tablename__ = "vendor_inquiries"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    contact_number = Column(String(40), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    business_type = Column(String(120), nullable=False)
    opted_options = Column(Text, nullable=False)
    previous_experience = Column(Text)
    healthy_concept = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
