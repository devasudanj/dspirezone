from datetime import date, time, datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, field_validator

from .models import UserRole, BookingStatus, ItemType, PriceType, TableRateType


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------------------------------------------------------------------------
# Venue
# ---------------------------------------------------------------------------

class VenueOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    address: Optional[str] = None
    base_hourly_rate: float
    min_hours: int
    buffer_minutes: int
    timezone: str
    included_rooms_count: int
    extra_room_hourly_rate: float
    foodcourt_table_rate_type: TableRateType
    foodcourt_table_rate: float

    model_config = {"from_attributes": True}


class VenueUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    base_hourly_rate: Optional[float] = None
    min_hours: Optional[int] = None
    buffer_minutes: Optional[int] = None
    timezone: Optional[str] = None
    included_rooms_count: Optional[int] = None
    extra_room_hourly_rate: Optional[float] = None
    foodcourt_table_rate_type: Optional[TableRateType] = None
    foodcourt_table_rate: Optional[float] = None


# ---------------------------------------------------------------------------
# Catalog Items
# ---------------------------------------------------------------------------

class CatalogItemCreate(BaseModel):
    name: str
    description: Optional[str] = None
    type: ItemType
    price_type: PriceType = PriceType.fixed
    unit_label: str = "item"
    price: float
    active: bool = True
    sort_order: int = 0


class CatalogItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    type: Optional[ItemType] = None
    price_type: Optional[PriceType] = None
    unit_label: Optional[str] = None
    price: Optional[float] = None
    active: Optional[bool] = None
    sort_order: Optional[int] = None


class CatalogItemOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    type: ItemType
    price_type: PriceType
    unit_label: str
    price: float
    active: bool
    sort_order: int

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Availability
# ---------------------------------------------------------------------------

class AvailabilityRuleCreate(BaseModel):
    day_of_week: int  # 0=Mon … 6=Sun
    start_time: time
    end_time: time


class AvailabilityRuleOut(BaseModel):
    id: int
    venue_id: int
    day_of_week: int
    start_time: time
    end_time: time

    model_config = {"from_attributes": True}


class BlackoutDateCreate(BaseModel):
    date: date
    reason: Optional[str] = None


class BlackoutDateOut(BaseModel):
    id: int
    venue_id: int
    date: date
    reason: Optional[str] = None

    model_config = {"from_attributes": True}


class AvailableSlotsResponse(BaseModel):
    date: date
    duration_hours: float
    slots: List[str]  # HH:MM strings
    is_blackout: bool
    blackout_reason: Optional[str] = None


# ---------------------------------------------------------------------------
# Bookings
# ---------------------------------------------------------------------------

class BookingLineItemInput(BaseModel):
    catalog_item_id: int
    quantity: float = 1.0


class BookingCreate(BaseModel):
    venue_id: int = 1
    date: date
    start_time: time
    duration_hours: float
    extra_rooms_count: int = 0
    foodcourt_tables_count: int = 0
    foodcourt_table_notes: Optional[str] = None
    notes: Optional[str] = None
    line_items: List[BookingLineItemInput] = []

    @field_validator("duration_hours")
    @classmethod
    def min_duration(cls, v: float) -> float:
        if v < 2:
            raise ValueError("Minimum booking duration is 2 hours")
        return v


class BookingLineItemOut(BaseModel):
    id: int
    catalog_item_id: Optional[int] = None
    item_type: str
    item_name: Optional[str] = None
    quantity: float
    unit_price: float
    price_type: Optional[str] = None
    unit_label: Optional[str] = None
    line_total: float

    model_config = {"from_attributes": True}


class PriceBreakdown(BaseModel):
    venue_subtotal: float
    addons_subtotal: float
    foodcourt_subtotal: float
    extra_rooms_subtotal: float
    favors_subtotal: float
    total: float
    duration_hours: float
    buffer_minutes: int


class BookingOut(BaseModel):
    id: int
    venue_id: int
    user_id: int
    date: date
    start_time: time
    end_time: time
    status: BookingStatus
    total_price: float
    confirmation_code: str
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    rooms_included_count: int
    extra_rooms_count: int
    foodcourt_tables_count: int
    foodcourt_table_notes: Optional[str] = None
    line_items: List[BookingLineItemOut] = []
    price_breakdown: Optional[PriceBreakdown] = None

    model_config = {"from_attributes": True}


class BookingStatusUpdate(BaseModel):
    status: BookingStatus


# ---------------------------------------------------------------------------
# Vendor Inquiries
# ---------------------------------------------------------------------------

class VendorInquiryCreate(BaseModel):
    name: str
    contact_number: str
    email: EmailStr
    business_type: str
    opted_options: List[str]
    previous_experience: Optional[str] = None
    healthy_concept: Optional[str] = None


class VendorInquiryOut(BaseModel):
    id: int
    name: str
    contact_number: str
    email: str
    business_type: str
    opted_options: List[str]
    previous_experience: Optional[str] = None
    healthy_concept: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
