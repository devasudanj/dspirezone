from datetime import date, time, datetime
from datetime import date as _Date, time as _Time  # aliases used where field name shadows type name
from typing import Optional, List
from pydantic import BaseModel, EmailStr, field_validator, ValidationInfo

from .models import (
    UserRole,
    BookingStatus,
    ItemType,
    PriceType,
    TableRateType,
    NexGameStatus,
    NexStationStatus,
    NexSessionStatus,
)


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
    # Food-item specific (ignored for other types)
    emoji: Optional[str] = None
    shared: bool = False
    step: int = 1
    bg_color: Optional[str] = None
    price_label: Optional[str] = None
    thumbnail_url: Optional[str] = None
    image_url_2: Optional[str] = None
    image_url_3: Optional[str] = None
    category: Optional[str] = None
    min_order_qty: Optional[int] = 10


class CatalogItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    type: Optional[ItemType] = None
    price_type: Optional[PriceType] = None
    unit_label: Optional[str] = None
    price: Optional[float] = None
    active: Optional[bool] = None
    sort_order: Optional[int] = None
    emoji: Optional[str] = None
    shared: Optional[bool] = None
    step: Optional[int] = None
    bg_color: Optional[str] = None
    price_label: Optional[str] = None
    thumbnail_url: Optional[str] = None
    image_url_2: Optional[str] = None
    image_url_3: Optional[str] = None
    category: Optional[str] = None
    min_order_qty: Optional[int] = 10


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
    emoji: Optional[str] = None
    shared: Optional[bool] = False
    step: Optional[int] = 1
    bg_color: Optional[str] = None
    price_label: Optional[str] = None
    thumbnail_url: Optional[str] = None
    image_url_2: Optional[str] = None
    image_url_3: Optional[str] = None
    category: Optional[str] = None
    min_order_qty: int = 10

    @property
    def image_urls(self) -> list:
        return [u for u in [self.thumbnail_url, self.image_url_2, self.image_url_3] if u]

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
    guest_name: Optional[str] = None
    guest_email: Optional[EmailStr] = None
    guest_phone: Optional[str] = None
    extra_rooms_count: int = 0
    foodcourt_tables_count: int = 0
    foodcourt_table_notes: Optional[str] = None
    notes: Optional[str] = None
    food_amount_pretax: float = 0.0   # Pre-tax food menu total — stored for 5% GST invoice
    line_items: List[BookingLineItemInput] = []
    discount_code: Optional[str] = None
    discount_pct: Optional[float] = None

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
    # GST: Tamil Nadu (CGST 9% + SGST 9% = 18%)
    cgst: float = 0.0
    sgst: float = 0.0
    gst_amount: float = 0.0
    total_with_gst: float = 0.0
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
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    alt_email: Optional[str] = None
    alt_phone: Optional[str] = None
    notes: Optional[str] = None
    rooms_included_count: int
    extra_rooms_count: int
    foodcourt_tables_count: int
    foodcourt_table_notes: Optional[str] = None
    line_items: List[BookingLineItemOut] = []
    price_breakdown: Optional[PriceBreakdown] = None
    razorpay_invoice_id: Optional[str] = None
    razorpay_invoice_short_url: Optional[str] = None
    razorpay_food_invoice_id: Optional[str] = None
    razorpay_food_invoice_short_url: Optional[str] = None
    food_amount_pretax: Optional[float] = None
    discount_code: Optional[str] = None
    discount_pct: Optional[float] = None

    model_config = {"from_attributes": True}


class BookingStatusUpdate(BaseModel):
    status: BookingStatus


# ---------------------------------------------------------------------------
# Booking Modify / Update
# ---------------------------------------------------------------------------

class BookingUpdate(BaseModel):
    """Payload for modifying an existing booking. confirmation_code is used to
    authorise the update without requiring a login token."""

    confirmation_code: str
    date: Optional[_Date] = None
    start_time: Optional[_Time] = None
    duration_hours: Optional[float] = None
    extra_rooms_count: Optional[int] = None
    foodcourt_tables_count: Optional[int] = None
    foodcourt_table_notes: Optional[str] = None
    notes: Optional[str] = None
    line_items: Optional[List[BookingLineItemInput]] = None
    contact_name: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    alt_email: Optional[EmailStr] = None
    alt_phone: Optional[str] = None
    # Name of whoever is making the change (guest name or logged-in user name)
    changed_by_name: Optional[str] = None
    # Pre-tax food total — used to create the 5% GST food invoice
    food_amount_pretax: Optional[float] = None
    # Discount code to apply / change (empty string = remove discount)
    discount_code: Optional[str] = None


# ---------------------------------------------------------------------------
# Payments
# ---------------------------------------------------------------------------

class PaymentCreate(BaseModel):
    amount: float
    status: str = "completed"
    payment_ref: Optional[str] = None
    notes: Optional[str] = None


class PaymentOut(BaseModel):
    id: int
    booking_id: int
    amount: float
    status: str
    payment_ref: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class BookingAuditLogOut(BaseModel):
    id: int
    booking_id: int
    changed_by_name: Optional[str] = None
    changed_at: Optional[datetime] = None
    change_summary: Optional[str] = None

    model_config = {"from_attributes": True}


class PaymentsSummary(BaseModel):
    payments: List[PaymentOut]
    total_paid: float
    booking_total: float
    remaining_due: float


class AdminNoteCreate(BaseModel):
    note_text: str
    created_by_name: str = "Admin"


class AdminNoteOut(BaseModel):
    id: int
    booking_id: int
    note_text: str
    created_by_name: str
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class BookingOutWithPayments(BookingOut):
    """Extended BookingOut that includes payment summary and audit history."""
    total_paid: float = 0.0
    remaining_due: float = 0.0
    audit_logs: List[BookingAuditLogOut] = []
    admin_notes: List[AdminNoteOut] = []


# ---------------------------------------------------------------------------
# Razorpay / Payments
# ---------------------------------------------------------------------------

class RazorpayOrderCreate(BaseModel):
    """Request body for POST /api/payments/create-order."""
    booking_id: int
    # Guests (not logged in) authenticate with the booking confirmation code.
    # Logged-in owners/admins may leave this blank.
    confirmation_code: Optional[str] = None
    # If omitted the remaining outstanding balance on the booking is charged.
    amount: Optional[float] = None
    # Minimum amount for first partial payment (enables Razorpay's native partial UI).
    min_partial_amount: Optional[float] = None


class RazorpayOrderOut(BaseModel):
    """Response from POST /api/payments/create-order – passed directly to Razorpay Checkout."""
    razorpay_order_id: str
    amount: float          # INR (human-readable, e.g. 1500.00)
    currency: str
    razorpay_key_id: str   # public key – safe to expose to the browser
    booking_id: int
    payment_id: int        # our internal Payment.id (pending record)


class PaymentVerify(BaseModel):
    """Request body for POST /api/payments/verify (frontend checkout callback)."""
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class PaymentVerifyOut(BaseModel):
    success: bool
    payment_id: int
    booking_id: int
    amount: float
    message: str


class RazorpayInvoiceOut(BaseModel):
    invoice_id: str
    short_url: str
    status: str
    amount: float  # INR
    booking_id: int


class SplitInvoiceOut(BaseModel):
    """Response for the /payments/invoice endpoint — contains both event and food invoices."""
    booking_id: int

    # Event invoice (18% GST) — always present
    event_invoice_id: str
    event_invoice_ref: str               # DZ/E/00001
    event_invoice_short_url: str
    event_invoice_status: str
    event_invoice_amount: float          # INR (incl. GST)

    # Food invoice (5% GST) — only present when food was ordered
    food_invoice_id: Optional[str] = None
    food_invoice_ref: Optional[str] = None   # DZ/F/00001
    food_invoice_short_url: Optional[str] = None
    food_invoice_status: Optional[str] = None
    food_invoice_amount: Optional[float] = None  # INR (incl. GST)


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


# ---------------------------------------------------------------------------
# Discount Codes
# ---------------------------------------------------------------------------

class DiscountCodeCreate(BaseModel):
    code: str
    description: Optional[str] = None
    discount_pct: float
    active: bool = True
    valid_from: Optional[date] = None
    valid_until: Optional[date] = None


class DiscountCodeUpdate(BaseModel):
    description: Optional[str] = None
    discount_pct: Optional[float] = None
    active: Optional[bool] = None
    valid_from: Optional[date] = None
    valid_until: Optional[date] = None


class DiscountCodeOut(BaseModel):
    id: int
    code: str
    description: Optional[str] = None
    discount_pct: float
    active: bool
    valid_from: Optional[date] = None
    valid_until: Optional[date] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class DiscountValidateRequest(BaseModel):
    code: str
    booking_date: Optional[date] = None


class DiscountValidateResponse(BaseModel):
    valid: bool
    discount_pct: float
    message: str


# ---------------------------------------------------------------------------
# NEX Playground
# ---------------------------------------------------------------------------

class NexGameOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    status: NexGameStatus
    is_available: bool
    station_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class NexGameListResponse(BaseModel):
    items: List[NexGameOut]
    total: int
    page: int
    page_size: int


class NexGameVisitCreate(BaseModel):
    session_id: Optional[str] = None
    source: Optional[str] = None
    metadata: Optional[dict] = None


class NexGameVisitOut(BaseModel):
    id: int
    game_id: int
    user_id: Optional[int] = None
    session_id: Optional[str] = None
    source: Optional[str] = None
    metadata: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class NexGameVisitResponse(BaseModel):
    success: bool
    visit_id: int


class NexStationOut(BaseModel):
    id: int
    code: str
    name: str
    status: NexStationStatus
    is_available: bool
    capabilities: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class NexSessionCreate(BaseModel):
    game_id: int
    station_id: int
    participant_name: str
    participant_count: int
    start_at: datetime
    end_at: datetime
    notes: Optional[str] = None

    @field_validator("participant_count")
    @classmethod
    def validate_participants(cls, value: int) -> int:
        if value < 1:
            raise ValueError("participant_count must be at least 1")
        return value

    @field_validator("end_at")
    @classmethod
    def validate_time_order(cls, value: datetime, info: ValidationInfo):
        start_at = info.data.get("start_at")
        if start_at and value <= start_at:
            raise ValueError("end_at must be greater than start_at")
        return value


class NexSessionOut(BaseModel):
    id: int
    game_id: int
    station_id: int
    user_id: Optional[int] = None
    participant_name: str
    participant_count: int
    start_at: datetime
    end_at: datetime
    status: NexSessionStatus
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    game: Optional[NexGameOut] = None
    station: Optional[NexStationOut] = None

    model_config = {"from_attributes": True}
