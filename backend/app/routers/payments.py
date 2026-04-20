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
    receipt = f"dz-{booking.confirmation_code}"
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


@router.post("/invoice", response_model=RazorpayInvoiceOut)
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

    # --- If invoice already exists, refresh from Razorpay and return ---
    if booking.razorpay_invoice_id:
        try:
            inv = rzp.get_invoice(booking.razorpay_invoice_id)
        except httpx.HTTPStatusError as exc:
            logger.error("Razorpay get_invoice error: %s", exc.response.text)
            raise HTTPException(status_code=502, detail="Could not fetch invoice from payment gateway")
        return RazorpayInvoiceOut(
            invoice_id=inv["id"],
            short_url=inv.get("short_url", booking.razorpay_invoice_short_url or ""),
            status=inv.get("status", "unknown"),
            amount=(inv.get("amount", 0) or 0) / 100,
            booking_id=booking.id,
        )

    # --- Build line_items from booking ---
    customer_name = (booking.contact_name or "Guest").strip() or "Guest"

    line_items: list[dict] = []
    duration_hours: float = 0.0  # computed below if times are available

    # 1. Event space – hourly charge (base_hourly_rate × duration_hours)
    venue = booking.venue
    if booking.start_time and booking.end_time and venue:
        start_mins = booking.start_time.hour * 60 + booking.start_time.minute
        end_mins   = booking.end_time.hour   * 60 + booking.end_time.minute
        duration_hours = (end_mins - start_mins) / 60.0
        if duration_hours > 0:
            hourly_rate = venue.base_hourly_rate or 1500.0
            venue_total_paise = int(round(hourly_rate * duration_hours * 100))
            line_items.append({
                "name": f"Event Space – {duration_hours:g} hr × ₹{hourly_rate:,.0f}/hr",
                "amount": int(round(hourly_rate * 100)),   # unit price in paise
                "quantity": int(duration_hours) if duration_hours == int(duration_hours) else duration_hours,
            })

        # 2. Extra rooms (if any)
        if (booking.extra_rooms_count or 0) > 0 and venue.extra_room_hourly_rate:
            extra_rate = venue.extra_room_hourly_rate
            qty = booking.extra_rooms_count
            line_items.append({
                "name": f"Extra Room × {qty} – {duration_hours:g} hr @ ₹{extra_rate:,.0f}/hr each",
                "amount": int(round(extra_rate * duration_hours * 100)),
                "quantity": qty,
            })

        # 3. Food court tables (if any)
        if (booking.foodcourt_tables_count or 0) > 0 and venue.foodcourt_table_rate:
            fc_rate = venue.foodcourt_table_rate
            fc_qty  = booking.foodcourt_tables_count
            line_items.append({
                "name": f"Food Court Table × {fc_qty}",
                "amount": int(round(fc_rate * 100)),
                "quantity": fc_qty,
            })

    # 4. Catalog add-ons / favors
    if booking.line_items:
        for li in booking.line_items:
            name = getattr(li, "item_name", None) or f"Item #{getattr(li, 'catalog_item_id', '?')}"
            price_type = getattr(li, "price_type", None) or "fixed"
            unit_price = getattr(li, "unit_price", None) or 0
            quantity = getattr(li, "quantity", 1) or 1
            line_total = getattr(li, "line_total", None)

            # Use pre-computed line_total so hourly items reflect full charge
            # (unit_price × duration_hours already calculated at booking time).
            if line_total is not None and line_total > 0:
                total_to_use = line_total
            else:
                total_to_use = unit_price * quantity

            amount_paise = int(round(total_to_use * 100))

            # Annotate hourly items so the invoice label is clear
            if price_type == "per_hour" and duration_hours > 0:
                label = f"{name} ({duration_hours:g} hr × ₹{unit_price:,.0f}/hr)"
            elif price_type == "per_unit" and quantity != 1:
                label = f"{name} × {int(quantity)}"
            else:
                label = name

            if amount_paise > 0:
                line_items.append({
                    "name": label,
                    "amount": amount_paise,
                    "quantity": 1,
                })

    # GST: Tamil Nadu — CGST 9% + SGST 9% = 18% on top of all service line items
    if line_items:
        pre_gst_base = booking.total_price / 1.18
        cgst_inv = round(pre_gst_base * 0.09, 2)
        sgst_inv = round(pre_gst_base * 0.09, 2)
        if cgst_inv > 0:
            line_items.append({
                "name": "CGST @ 9% (Tamil Nadu)",
                "amount": int(round(cgst_inv * 100)),
                "quantity": 1,
            })
        if sgst_inv > 0:
            line_items.append({
                "name": "SGST @ 9% (Tamil Nadu)",
                "amount": int(round(sgst_inv * 100)),
                "quantity": 1,
            })

    if not line_items:
        # Fallback: single line item for total price
        line_items = [{
            "name": f"Booking {booking.confirmation_code}",
            "amount": int(round(booking.total_price * 100)),
            "quantity": 1,
        }]

    # Compute total already paid for this booking
    total_paid = sum(
        p.amount for p in booking.payments if p.status == PaymentStatus.completed
    )
    balance_due = max(0.0, booking.total_price - total_paid)

    # Embed payment summary in description — shows prominently on the hosted invoice
    description = (
        f"Booking {booking.confirmation_code} – {customer_name} | "
        f"Order Total: INR {booking.total_price:,.2f} | "
        f"Advance Paid: INR {total_paid:,.2f} | "
        f"Balance Due: INR {balance_due:,.2f}"
    )

    invoice_notes: dict = {
        "Order_Total": f"INR {booking.total_price:,.2f}",
        "Amount_Paid": f"INR {total_paid:,.2f}",
        "Balance_Due": f"INR {balance_due:,.2f}",
        "Confirmation": booking.confirmation_code,
    }

    try:
        inv = rzp.create_invoice(
            customer_name=customer_name,
            customer_email=booking.contact_email or "",
            customer_phone=booking.contact_phone or None,
            description=description,
            line_items=line_items,
            currency=settings.RAZORPAY_CURRENCY,
            notes=invoice_notes,
        )
    except httpx.HTTPStatusError as exc:
        logger.error("Razorpay create_invoice HTTP error: %s – %s", exc.response.status_code, exc.response.text)
        raise HTTPException(status_code=502, detail="Invoice creation failed. Please try again.")
    except Exception as exc:
        logger.error("Razorpay create_invoice failed: %s", exc)
        raise HTTPException(status_code=502, detail="Invoice creation failed. Please try again.")

    booking.razorpay_invoice_id = inv["id"]
    booking.razorpay_invoice_short_url = inv.get("short_url", "")
    db.commit()

    logger.info(
        "Invoice created: %s  booking=%s  short_url=%s",
        inv["id"], booking.id, inv.get("short_url"),
    )

    return RazorpayInvoiceOut(
        invoice_id=inv["id"],
        short_url=inv.get("short_url", ""),
        status=inv.get("status", "draft"),
        amount=(inv.get("amount", 0) or 0) / 100,
        booking_id=booking.id,
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
