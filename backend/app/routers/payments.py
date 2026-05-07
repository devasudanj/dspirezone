"""
Payments router  –  /api/payments
----------------------------------
Endpoints:
  POST /api/payments/create-order   – initiate Razorpay order for a booking
  POST /api/payments/verify         – confirm payment after Razorpay Checkout
  POST /api/payments/webhook        – Razorpay webhook (signature-verified)
"""

import json
import logging
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..core import razorpay as rzp
from ..core.config import settings
from ..database import get_db
from ..deps import get_optional_user
from ..models import Booking, BookingStatus, Payment, PaymentStatus, User, UserRole
from ..schemas import (
    PaymentOut,
    PaymentVerify,
    PaymentVerifyOut,
    RazorpayInvoiceOut,
    RazorpayOrderCreate,
    RazorpayOrderOut,
    SplitInvoiceOut,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _total_paid(booking: Booking) -> float:
    return sum(
        p.amount for p in booking.payments
        if p.status == PaymentStatus.completed
    )


def _remaining_due(booking: Booking) -> float:
    return max(0.0, booking.total_price - _total_paid(booking))


# ---------------------------------------------------------------------------
# POST /api/payments/create-order
# ---------------------------------------------------------------------------

@router.post("/create-order", response_model=RazorpayOrderOut)
def create_order(
    payload: RazorpayOrderCreate,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """
    Create a Razorpay order for a booking and return the details needed by
    the frontend Razorpay Checkout widget.

    Authorization:
    - Logged-in booking owner or admin: no confirmation_code needed.
    - Guest / unauthenticated: must supply the booking's confirmation_code.
    """
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payment gateway is not configured on this server",
        )

    booking: Booking | None = db.get(Booking, payload.booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # --- Authorise ---
    is_owner_or_admin = current_user and (
        current_user.id == booking.user_id
        or current_user.role == UserRole.admin
    )
    code_valid = (
        payload.confirmation_code
        and booking.confirmation_code.upper() == payload.confirmation_code.upper()
    )
    if not is_owner_or_admin and not code_valid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid confirmation code or unauthorised",
        )

    if booking.status == BookingStatus.cancelled:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot initiate payment for a cancelled booking",
        )

    # --- Determine amount ---
    amount_inr = payload.amount if payload.amount else _remaining_due(booking)
    if amount_inr <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No outstanding balance on this booking",
        )
    if amount_inr < 1.0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Minimum payable amount is ₹1.00",
        )

    # --- Create Razorpay order ---
    receipt = f"DZ-EFG-{booking.id:05d}"
    min_partial = payload.min_partial_amount
    if min_partial is not None and min_partial < 1.0:
        min_partial = 1.0
    try:
        order = rzp.create_order(
            amount_inr=amount_inr,
            currency=settings.RAZORPAY_CURRENCY,
            receipt=receipt,
            notes={
                "booking_id": str(booking.id),
                "confirmation_code": booking.confirmation_code,
                "contact_email": booking.contact_email or "",
            },
            min_partial_amount_inr=min_partial,
        )
    except httpx.HTTPStatusError as exc:
        logger.error("Razorpay create_order HTTP error: %s – %s", exc.response.status_code, exc.response.text)
        raise HTTPException(status_code=502, detail="Payment gateway returned an error. Please try again.")
    except Exception as exc:
        logger.error("Razorpay create_order failed: %s", exc)
        raise HTTPException(status_code=502, detail="Payment gateway unreachable. Please try again.")

    razorpay_order_id: str = order["id"]

    # --- Persist a pending Payment record ---
    payment = Payment(
        booking_id=booking.id,
        amount=amount_inr,
        status=PaymentStatus.pending,
        payment_ref=razorpay_order_id,
        notes=f"Razorpay order {razorpay_order_id} created",
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    logger.info(
        "Razorpay order created: %s  booking=%s  amount=%.2f %s",
        razorpay_order_id, booking.id, amount_inr, settings.RAZORPAY_CURRENCY,
    )

    return RazorpayOrderOut(
        razorpay_order_id=razorpay_order_id,
        amount=amount_inr,
        currency=order["currency"],
        razorpay_key_id=settings.RAZORPAY_KEY_ID,
        booking_id=booking.id,
        payment_id=payment.id,
    )


# ---------------------------------------------------------------------------
# POST /api/payments/verify
# ---------------------------------------------------------------------------

@router.post("/verify", response_model=PaymentVerifyOut)
def verify_payment(
    payload: PaymentVerify,
    db: Session = Depends(get_db),
):
    """
    Called by the frontend after Razorpay Checkout succeeds.
    Verifies the HMAC-SHA256 signature, then marks the Payment as completed.
    This endpoint is self-authenticating via the Razorpay signature.
    """
    if not rzp.verify_payment_signature(
        payload.razorpay_order_id,
        payload.razorpay_payment_id,
        payload.razorpay_signature,
    ):
        logger.warning(
            "Payment signature verification failed for order=%s payment=%s",
            payload.razorpay_order_id, payload.razorpay_payment_id,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment signature verification failed",
        )

    # Find the pending payment by razorpay order_id
    payment: Payment | None = (
        db.query(Payment)
        .filter(Payment.payment_ref == payload.razorpay_order_id)
        .first()
    )
    if not payment:
        raise HTTPException(
            status_code=404,
            detail="No pending payment found for this order",
        )

    # Idempotent – already confirmed (e.g. webhook arrived first)
    if payment.status == PaymentStatus.completed:
        return PaymentVerifyOut(
            success=True,
            payment_id=payment.id,
            booking_id=payment.booking_id,
            amount=payment.amount,
            message="Payment already recorded",
        )

    # Fetch the actual captured amount from Razorpay so partial payments are
    # recorded correctly (the pending Payment was created with the full order
    # amount; the user may have paid only the minimum partial amount).
    actual_amount = payment.amount  # fallback
    try:
        rzp_payment = rzp.fetch_payment(payload.razorpay_payment_id)
        actual_amount = rzp_payment.get("amount", 0) / 100  # paise → INR
    except Exception as exc:
        logger.warning(
            "Could not fetch payment amount from Razorpay (%s) – using order amount %.2f",
            exc, payment.amount,
        )

    payment.status = PaymentStatus.completed
    payment.amount = actual_amount
    # Store the Razorpay payment_id as the canonical reference going forward
    payment.payment_ref = payload.razorpay_payment_id
    payment.notes = (
        f"Verified via checkout callback. "
        f"order={payload.razorpay_order_id} payment={payload.razorpay_payment_id}"
    )
    db.commit()

    logger.info(
        "Payment verified: %s  booking=%s  amount=%.2f",
        payload.razorpay_payment_id, payment.booking_id, actual_amount,
    )

    return PaymentVerifyOut(
        success=True,
        payment_id=payment.id,
        booking_id=payment.booking_id,
        amount=actual_amount,
        message="Payment successful",
    )


# ---------------------------------------------------------------------------
# POST /api/payments/invoice
# ---------------------------------------------------------------------------

class _InvoiceRequest(BaseModel):
    booking_id: int
    confirmation_code: Optional[str] = None
    force_regenerate: bool = False  # cancel & recreate invoices with current booking data


# ---------------------------------------------------------------------------
# Shared helper — usable from bookings router without HTTP self-call
# ---------------------------------------------------------------------------

def regenerate_booking_invoices(booking: Booking, db: Session) -> tuple[str | None, str | None]:
    """
    Cancel any existing Razorpay invoices for *booking*, recreate them from
    the current booking data, persist the new IDs/URLs, and return
    (event_short_url, food_short_url).

    Raises on Razorpay HTTP errors so the caller can decide whether to abort
    or swallow and continue.  The caller is responsible for db.commit() after
    this returns (this function commits internally at each safe point).
    """
    # --- Cancel existing invoices ---
    for inv_id in [booking.razorpay_invoice_id, booking.razorpay_food_invoice_id]:
        if not inv_id:
            continue
        try:
            cancelled = rzp.cancel_invoice(inv_id)
            logger.info(
                "Cancelled invoice %s status=%s for booking %s",
                inv_id, cancelled.get("status"), booking.id,
            )
        except Exception as exc:
            logger.warning("Could not cancel invoice %s: %s", inv_id, exc)

    booking.razorpay_invoice_id = None
    booking.razorpay_invoice_short_url = None
    booking.razorpay_food_invoice_id = None
    booking.razorpay_food_invoice_short_url = None
    db.commit()

    # --- Build EVENT line items (venue, add-ons, favors — 18% GST) ---
    customer_name = (booking.contact_name or "Guest").strip() or "Guest"
    inv_seq = f"{booking.id:05d}"
    event_inv_ref = f"DZ/E/{inv_seq}"
    food_inv_ref = f"DZ/F/{inv_seq}"

    event_items: list[dict] = []
    duration_hours: float = 0.0

    venue = booking.venue
    if booking.start_time and booking.end_time and venue:
        start_mins = booking.start_time.hour * 60 + booking.start_time.minute
        end_mins = booking.end_time.hour * 60 + booking.end_time.minute
        duration_hours = (end_mins - start_mins) / 60.0
        if duration_hours > 0:
            hourly_rate = venue.base_hourly_rate or 1500.0
            event_items.append({
                "name": f"Event Space \u2013 {duration_hours:g} hr \u00d7 \u20b9{hourly_rate:,.0f}/hr",
                "amount": int(round(hourly_rate * 100)),
                "quantity": int(duration_hours) if duration_hours == int(duration_hours) else duration_hours,
            })
        if (booking.extra_rooms_count or 0) > 0 and venue.extra_room_hourly_rate:
            extra_rate = venue.extra_room_hourly_rate
            qty = booking.extra_rooms_count
            event_items.append({
                "name": f"Extra Room \u00d7 {qty} \u2013 {duration_hours:g} hr @ \u20b9{extra_rate:,.0f}/hr each",
                "amount": int(round(extra_rate * duration_hours * 100)),
                "quantity": qty,
            })
        if (booking.foodcourt_tables_count or 0) > 0 and venue.foodcourt_table_rate:
            fc_rate = venue.foodcourt_table_rate
            fc_qty = booking.foodcourt_tables_count
            event_items.append({
                "name": f"Food Court Table \u00d7 {fc_qty}",
                "amount": int(round(fc_rate * 100)),
                "quantity": fc_qty,
            })

    if booking.line_items:
        for li in booking.line_items:
            name = getattr(li, "item_name", None) or f"Item #{getattr(li, 'catalog_item_id', '?')}"
            price_type = getattr(li, "price_type", None) or "fixed"
            unit_price = getattr(li, "unit_price", None) or 0
            quantity = getattr(li, "quantity", 1) or 1
            line_total = getattr(li, "line_total", None)
            total_to_use = line_total if (line_total is not None and line_total > 0) else unit_price * quantity
            amount_paise = int(round(total_to_use * 100))
            if price_type == "per_hour" and duration_hours > 0:
                label = f"{name} ({duration_hours:g} hr \u00d7 \u20b9{unit_price:,.0f}/hr)"
            elif price_type == "per_unit" and quantity != 1:
                label = f"{name} \u00d7 {int(quantity)}"
            else:
                label = name
            if amount_paise > 0:
                event_items.append({"name": label, "amount": amount_paise, "quantity": 1})

    # Apply discount to the first (venue) line item
    discount_pct = getattr(booking, "discount_pct", None) or 0.0
    discount_code = getattr(booking, "discount_code", None)
    if discount_pct > 0 and discount_code and event_items:
        vi = event_items[0]
        discount_factor = 1.0 - (discount_pct / 100.0)
        vi["name"] = f"{vi['name']} | Discount: {discount_code} ({discount_pct:.0f}% off)"
        vi["amount"] = max(1, int(round(vi["amount"] * discount_factor)))

    event_subtotal_inr = sum((item["amount"] / 100) * item["quantity"] for item in event_items)
    event_cgst = round(event_subtotal_inr * 0.09, 2)
    event_sgst = round(event_subtotal_inr * 0.09, 2)

    event_line_items = list(event_items)
    if event_cgst > 0:
        event_line_items.append({"name": "CGST @ 9% (Tamil Nadu) \u2013 Event Services", "amount": int(round(event_cgst * 100)), "quantity": 1})
    if event_sgst > 0:
        event_line_items.append({"name": "SGST @ 9% (Tamil Nadu) \u2013 Event Services", "amount": int(round(event_sgst * 100)), "quantity": 1})

    if not event_line_items:
        food_pretax_fb = booking.food_amount_pretax or 0.0
        food_with_gst_fb = round(food_pretax_fb * 1.05, 2)
        event_amount_fb = max(0.0, booking.total_price - food_with_gst_fb)
        event_line_items = [{"name": f"Booking {booking.confirmation_code}", "amount": int(round(event_amount_fb * 100)), "quantity": 1}]

    event_total_paid = sum(p.amount for p in booking.payments if p.status == PaymentStatus.completed)
    event_balance_due = max(0.0, booking.total_price - event_total_paid)

    event_description = (
        f"{event_inv_ref} | Booking {booking.confirmation_code} \u2013 {customer_name} | "
        f"Event Invoice (18% GST) | "
        f"Order Total: INR {booking.total_price:,.2f} | "
        f"Advance Paid: INR {event_total_paid:,.2f} | "
        f"Balance Due: INR {event_balance_due:,.2f}"
    )

    # --- Create + issue EVENT invoice ---
    inv = rzp.create_invoice(
        customer_name=customer_name,
        customer_email=booking.contact_email or "",
        customer_phone=booking.contact_phone or None,
        description=event_description,
        line_items=event_line_items,
        currency=settings.RAZORPAY_CURRENCY,
        notes={
            "Invoice_No": event_inv_ref,
            "Invoice_Type": "Event (18% GST)",
            "Order_Total": f"INR {booking.total_price:,.2f}",
            "Amount_Paid": f"INR {event_total_paid:,.2f}",
            "Balance_Due": f"INR {event_balance_due:,.2f}",
            "Confirmation": booking.confirmation_code,
        },
    )
    booking.razorpay_invoice_id = inv["id"]
    booking.razorpay_invoice_short_url = inv.get("short_url", "")
    db.commit()

    inv = rzp.issue_invoice(inv["id"])
    booking.razorpay_invoice_short_url = inv.get("short_url", "") or booking.razorpay_invoice_short_url
    event_short_url = booking.razorpay_invoice_short_url

    # --- Create + issue FOOD invoice if applicable ---
    food_short_url: str | None = None
    food_pretax = booking.food_amount_pretax or 0.0
    if food_pretax > 0:
        food_cgst = round(food_pretax * 0.025, 2)
        food_sgst = round(food_pretax * 0.025, 2)
        food_total = round(food_pretax + food_cgst + food_sgst, 2)
        try:
            food_inv = rzp.create_invoice(
                customer_name=customer_name,
                customer_email=booking.contact_email or "",
                customer_phone=booking.contact_phone or None,
                description=(
                    f"{food_inv_ref} | Booking {booking.confirmation_code} \u2013 {customer_name} | "
                    f"Food & Beverages Invoice (5% GST) | "
                    f"Food Total (incl. GST): INR {food_total:,.2f}"
                ),
                line_items=[
                    {"name": "Food & Beverages Selection", "amount": int(round(food_pretax * 100)), "quantity": 1},
                    {"name": "CGST @ 2.5% (Tamil Nadu) \u2013 Food", "amount": int(round(food_cgst * 100)), "quantity": 1},
                    {"name": "SGST @ 2.5% (Tamil Nadu) \u2013 Food", "amount": int(round(food_sgst * 100)), "quantity": 1},
                ],
                currency=settings.RAZORPAY_CURRENCY,
                notes={
                    "Invoice_No": food_inv_ref,
                    "Invoice_Type": "Food & Beverages (5% GST)",
                    "Food_Total": f"INR {food_total:,.2f}",
                    "Confirmation": booking.confirmation_code,
                },
            )
            food_inv = rzp.issue_invoice(food_inv["id"])
            booking.razorpay_food_invoice_id = food_inv["id"]
            booking.razorpay_food_invoice_short_url = food_inv.get("short_url", "")
            food_short_url = booking.razorpay_food_invoice_short_url
            logger.info("Food invoice created+issued: %s  booking=%s", food_inv["id"], booking.id)
        except Exception as exc:
            logger.error("Food invoice creation failed (non-fatal): %s", exc)

    db.commit()
    logger.info("Event invoice created+issued: %s  booking=%s  url=%s", inv["id"], booking.id, event_short_url)
    return (event_short_url or None, food_short_url)


@router.post("/invoice", response_model=SplitInvoiceOut)
def generate_invoice(
    payload: _InvoiceRequest,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """
    Idempotent invoice generation via Razorpay Invoices API.
    If an invoice already exists for the booking, returns the current status.
    Auth: admin/owner JWT *or* confirmation_code (same as create-order).
    """
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payment gateway is not configured on this server",
        )

    booking: Booking | None = db.get(Booking, payload.booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # --- Authorise ---
    is_owner_or_admin = current_user and (
        current_user.id == booking.user_id
        or current_user.role == UserRole.admin
    )
    code_valid = (
        payload.confirmation_code
        and booking.confirmation_code.upper() == payload.confirmation_code.upper()
    )
    if not is_owner_or_admin and not code_valid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid confirmation code or unauthorised",
        )

    # --- If event invoice already exists, refresh from Razorpay (and create food if missing) ---
    if booking.razorpay_invoice_id and not payload.force_regenerate:
        inv_seq = f"{booking.id:05d}"
        event_inv_ref = f"DZ/E/{inv_seq}"
        food_inv_ref = f"DZ/F/{inv_seq}"
        customer_name = (booking.contact_name or "Guest").strip() or "Guest"

        try:
            inv = rzp.get_invoice(booking.razorpay_invoice_id)
        except httpx.HTTPStatusError as exc:
            logger.error("Razorpay get_invoice error: %s", exc.response.text)
            raise HTTPException(status_code=502, detail="Could not fetch invoice from payment gateway")

        event_id = inv["id"]
        event_url = inv.get("short_url", booking.razorpay_invoice_short_url or "")
        event_status = inv.get("status", "unknown")
        event_amount = (inv.get("amount", 0) or 0) / 100

        # Create food invoice if food was ordered but no food invoice exists yet
        food_pretax = booking.food_amount_pretax or 0.0
        if food_pretax > 0 and not booking.razorpay_food_invoice_id:
            food_cgst = round(food_pretax * 0.025, 2)
            food_sgst = round(food_pretax * 0.025, 2)
            food_total_inr = round(food_pretax + food_cgst + food_sgst, 2)
            try:
                food_inv = rzp.create_invoice(
                    customer_name=customer_name,
                    customer_email=booking.contact_email or "",
                    customer_phone=booking.contact_phone or None,
                    description=(
                        f"{food_inv_ref} | Booking {booking.confirmation_code} – {customer_name} | "
                        f"Food & Beverages Invoice (5% GST) | "
                        f"Food Total (incl. GST): INR {food_total_inr:,.2f}"
                    ),
                    line_items=[
                        {"name": "Food & Beverages Selection", "amount": int(round(food_pretax * 100)), "quantity": 1},
                        {"name": "CGST @ 2.5% (Tamil Nadu) – Food", "amount": int(round(food_cgst * 100)), "quantity": 1},
                        {"name": "SGST @ 2.5% (Tamil Nadu) – Food", "amount": int(round(food_sgst * 100)), "quantity": 1},
                    ],
                    currency=settings.RAZORPAY_CURRENCY,
                    notes={
                        "Invoice_No": food_inv_ref,
                        "Invoice_Type": "Food & Beverages (5% GST)",
                        "Food_Total": f"INR {food_total_inr:,.2f}",
                        "Confirmation": booking.confirmation_code,
                    },
                )
                # Issue so it gets a short_url
                food_inv = rzp.issue_invoice(food_inv["id"])
                booking.razorpay_food_invoice_id = food_inv["id"]
                booking.razorpay_food_invoice_short_url = food_inv.get("short_url", "")
                db.commit()
            except Exception as exc:
                logger.error("Razorpay food invoice creation (late) failed: %s", exc)

        # Refresh food invoice status if it exists
        food_id = booking.razorpay_food_invoice_id
        food_url = booking.razorpay_food_invoice_short_url or ""
        food_status = None
        food_amount = None
        if food_id:
            try:
                fi = rzp.get_invoice(food_id)
                food_url = fi.get("short_url", food_url)
                food_status = fi.get("status", "unknown")
                food_amount = (fi.get("amount", 0) or 0) / 100
            except Exception:
                food_status = "unknown"

        return SplitInvoiceOut(
            booking_id=booking.id,
            event_invoice_id=event_id,
            event_invoice_ref=event_inv_ref,
            event_invoice_short_url=event_url,
            event_invoice_status=event_status,
            event_invoice_amount=event_amount,
            food_invoice_id=food_id or None,
            food_invoice_ref=food_inv_ref if food_id else None,
            food_invoice_short_url=food_url or None,
            food_invoice_status=food_status,
            food_invoice_amount=food_amount,
        )

    # --- force_regenerate or first-time creation: use the shared helper ---
    try:
        _event_url, _food_url = regenerate_booking_invoices(booking, db)
    except httpx.HTTPStatusError as exc:
        logger.error("Razorpay invoice error: %s – %s", exc.response.status_code, exc.response.text)
        raise HTTPException(status_code=502, detail=f"Invoice creation failed: {exc.response.text}")
    except Exception as exc:
        logger.error("Razorpay invoice creation failed: %s", exc)
        raise HTTPException(status_code=502, detail=f"Invoice creation failed: {exc}")

    db.refresh(booking)
    inv_seq = f"{booking.id:05d}"
    event_inv_ref = f"DZ/E/{inv_seq}"
    food_inv_ref_val = f"DZ/F/{inv_seq}"

    food_pretax = booking.food_amount_pretax or 0.0
    food_id = booking.razorpay_food_invoice_id
    food_url = booking.razorpay_food_invoice_short_url or ""
    food_status: Optional[str] = "issued" if food_id else None
    food_amount: Optional[float] = None
    if food_pretax > 0 and food_id:
        food_cgst = round(food_pretax * 0.025, 2)
        food_sgst = round(food_pretax * 0.025, 2)
        food_amount = round(food_pretax + food_cgst + food_sgst, 2)

    return SplitInvoiceOut(
        booking_id=booking.id,
        event_invoice_id=booking.razorpay_invoice_id or "",
        event_invoice_ref=event_inv_ref,
        event_invoice_short_url=booking.razorpay_invoice_short_url or "",
        event_invoice_status="issued",
        event_invoice_amount=booking.total_price,
        food_invoice_id=food_id or None,
        food_invoice_ref=food_inv_ref_val if food_id else None,
        food_invoice_short_url=food_url or None,
        food_invoice_status=food_status,
        food_invoice_amount=food_amount,
    )


# ---------------------------------------------------------------------------
# POST /api/payments/webhook   (Razorpay → our server)
# ---------------------------------------------------------------------------

@router.post("/webhook", status_code=status.HTTP_200_OK)
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
):
    """
    Razorpay webhook receiver.

    Configure in the Razorpay Dashboard (Settings → Webhooks):
      URL:     https://<your-domain>/api/payments/webhook
      Secret:  <set RAZORPAY_WEBHOOK_SECRET in .env>
      Events:  payment.captured, payment.failed, refund.created

    Razorpay retries failed deliveries up to 3 times – this handler is
    idempotent (safe to process the same event multiple times).
    """
    # Read raw bytes BEFORE any JSON parsing so the HMAC covers the exact body
    raw_body: bytes = await request.body()

    # --- Signature verification ---
    if settings.RAZORPAY_WEBHOOK_SECRET:
        if not x_razorpay_signature:
            logger.warning("Webhook received without X-Razorpay-Signature header")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing X-Razorpay-Signature header",
            )
        if not rzp.verify_webhook_signature(raw_body, x_razorpay_signature):
            logger.warning("Webhook signature mismatch – possible spoofed request")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid webhook signature",
            )
    else:
        # Log a prominent warning so the operator knows this is insecure
        logger.warning(
            "RAZORPAY_WEBHOOK_SECRET is not set. "
            "Accepting webhook without signature verification – configure the "
            "secret in .env for production security."
        )

    # --- Parse payload ---
    try:
        event: dict = json.loads(raw_body.decode("utf-8"))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON payload",
        )

    event_type: str = event.get("event", "")
    logger.info("Razorpay webhook received: event=%s", event_type)

    if event_type == "payment.captured":
        _handle_payment_captured(event, db)
    elif event_type == "payment.failed":
        _handle_payment_failed(event, db)
    elif event_type == "refund.created":
        _handle_refund_created(event, db)
    else:
        logger.info("Unhandled Razorpay webhook event type: %s", event_type)

    # Always return 200 so Razorpay does not retry
    return {"status": "ok", "event": event_type}


# ---------------------------------------------------------------------------
# Webhook event handlers
# ---------------------------------------------------------------------------

def _handle_payment_captured(event: dict, db: Session) -> None:
    """payment.captured – the money has been collected successfully."""
    entity: dict = (
        event.get("payload", {})
            .get("payment", {})
            .get("entity", {})
    )
    razorpay_payment_id: str = entity.get("id", "")
    razorpay_order_id: str = entity.get("order_id", "")
    amount_paise: int = entity.get("amount", 0)

    if not razorpay_payment_id or not razorpay_order_id:
        logger.warning("payment.captured event missing id or order_id")
        return

    # Find the pending payment by Razorpay order_id
    payment: Payment | None = (
        db.query(Payment)
        .filter(Payment.payment_ref == razorpay_order_id)
        .first()
    )
    if not payment:
        logger.warning(
            "payment.captured: no pending Payment found for order=%s", razorpay_order_id
        )
        return

    if payment.status == PaymentStatus.completed:
        logger.info("payment.captured: already processed for order=%s", razorpay_order_id)
        return

    payment.status = PaymentStatus.completed
    payment.amount = amount_paise / 100
    payment.payment_ref = razorpay_payment_id
    payment.notes = (
        f"Captured via webhook. order={razorpay_order_id}"
    )
    db.commit()
    logger.info(
        "payment.captured: payment=%s  booking=%s  amount=%.2f",
        razorpay_payment_id, payment.booking_id, payment.amount,
    )


def _handle_payment_failed(event: dict, db: Session) -> None:
    """payment.failed – card declined / UPI timeout / etc."""
    entity: dict = (
        event.get("payload", {})
            .get("payment", {})
            .get("entity", {})
    )
    razorpay_payment_id: str = entity.get("id", "")
    razorpay_order_id: str = entity.get("order_id", "")
    error_desc: str = (
        entity.get("error_description", "")
        or entity.get("error_code", "unknown error")
    )

    payment: Payment | None = (
        db.query(Payment)
        .filter(Payment.payment_ref == razorpay_order_id)
        .first()
    )
    if not payment:
        logger.warning(
            "payment.failed: no Payment found for order=%s", razorpay_order_id
        )
        return

    if payment.status != PaymentStatus.pending:
        return  # Already in a terminal state

    payment.status = PaymentStatus.failed
    payment.notes = (
        f"Failed via webhook. order={razorpay_order_id} "
        f"payment={razorpay_payment_id} reason={error_desc}"
    )
    db.commit()
    logger.info(
        "payment.failed: payment=%s  booking=%s  reason=%s",
        razorpay_payment_id, payment.booking_id, error_desc,
    )


def _handle_refund_created(event: dict, db: Session) -> None:
    """refund.created – a refund was issued (may be partial)."""
    entity: dict = (
        event.get("payload", {})
            .get("refund", {})
            .get("entity", {})
    )
    refund_id: str = entity.get("id", "")
    razorpay_payment_id: str = entity.get("payment_id", "")
    amount_paise: int = entity.get("amount", 0)

    if not refund_id or not razorpay_payment_id:
        logger.warning("refund.created event missing id or payment_id")
        return

    # Idempotent: skip if we already recorded this refund
    existing = (
        db.query(Payment)
        .filter(Payment.payment_ref == refund_id)
        .first()
    )
    if existing:
        logger.info("refund.created: refund=%s already recorded", refund_id)
        return

    # Locate the original payment to find the booking
    original: Payment | None = (
        db.query(Payment)
        .filter(Payment.payment_ref == razorpay_payment_id)
        .first()
    )
    if not original:
        logger.warning(
            "refund.created: original Payment not found for payment=%s", razorpay_payment_id
        )
        return

    # Record the refund as a separate row with a negative amount
    refund = Payment(
        booking_id=original.booking_id,
        amount=-(amount_paise / 100),
        status=PaymentStatus.refunded,
        payment_ref=refund_id,
        notes=f"Refund via webhook. original_payment={razorpay_payment_id}",
    )
    db.add(refund)
    db.commit()
    logger.info(
        "refund.created: refund=%s  booking=%s  amount=%.2f",
        refund_id, original.booking_id, amount_paise / 100,
    )
