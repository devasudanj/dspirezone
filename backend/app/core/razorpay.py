"""
Razorpay HTTP client
--------------------
Thin wrapper around the Razorpay REST API v1, using httpx (already in
requirements.txt). No third-party Razorpay SDK needed.
"""

import hashlib
import hmac
import logging

import httpx

from .config import settings

logger = logging.getLogger(__name__)

_BASE_URL = "https://api.razorpay.com/v1"


def _auth() -> tuple[str, str]:
    return (settings.RAZORPAY_KEY_ID or "", settings.RAZORPAY_KEY_SECRET or "")


# ---------------------------------------------------------------------------
# Orders
# ---------------------------------------------------------------------------

def create_order(
    amount_inr: float,
    currency: str,
    receipt: str,
    notes: dict | None = None,
) -> dict:
    """Create a Razorpay order. Returns the full order object from the API."""
    amount_paise = int(round(amount_inr * 100))
    payload = {
        "amount": amount_paise,
        "currency": currency,
        # Razorpay receipt field max length is 40 chars
        "receipt": receipt[:40],
        "partial_payment": True,
        "notes": notes or {},
    }
    with httpx.Client(timeout=15) as client:
        resp = client.post(f"{_BASE_URL}/orders", json=payload, auth=_auth())
        resp.raise_for_status()
        return resp.json()


def fetch_order(order_id: str) -> dict:
    with httpx.Client(timeout=15) as client:
        resp = client.get(f"{_BASE_URL}/orders/{order_id}", auth=_auth())
        resp.raise_for_status()
        return resp.json()


# ---------------------------------------------------------------------------
# Payments
# ---------------------------------------------------------------------------

def fetch_payment(payment_id: str) -> dict:
    with httpx.Client(timeout=15) as client:
        resp = client.get(f"{_BASE_URL}/payments/{payment_id}", auth=_auth())
        resp.raise_for_status()
        return resp.json()


# ---------------------------------------------------------------------------
# Refunds
# ---------------------------------------------------------------------------

def create_refund(payment_id: str, amount_inr: float) -> dict:
    """Initiate a full or partial refund for a captured payment."""
    amount_paise = int(round(amount_inr * 100))
    with httpx.Client(timeout=15) as client:
        resp = client.post(
            f"{_BASE_URL}/payments/{payment_id}/refund",
            json={"amount": amount_paise},
            auth=_auth(),
        )
        resp.raise_for_status()
        return resp.json()


# ---------------------------------------------------------------------------
# Signature verification
# ---------------------------------------------------------------------------

def verify_payment_signature(order_id: str, payment_id: str, signature: str) -> bool:
    """
    Verify the razorpay_signature returned by Razorpay Checkout to the
    frontend after a successful payment.
    Algorithm: HMAC-SHA256(order_id + "|" + payment_id, key_secret)
    """
    if not settings.RAZORPAY_KEY_SECRET:
        logger.error("RAZORPAY_KEY_SECRET is not set – cannot verify signature")
        return False
    expected = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode("utf-8"),
        f"{order_id}|{payment_id}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def verify_webhook_signature(raw_body: bytes, signature: str) -> bool:
    """
    Verify the X-Razorpay-Signature header on incoming webhook requests.
    Algorithm: HMAC-SHA256(raw_body, webhook_secret)
    """
    if not settings.RAZORPAY_WEBHOOK_SECRET:
        return False
    expected = hmac.new(
        settings.RAZORPAY_WEBHOOK_SECRET.encode("utf-8"),
        raw_body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


# ---------------------------------------------------------------------------
# Invoices
# ---------------------------------------------------------------------------

def create_invoice(
    customer_name: str,
    customer_email: str,
    customer_phone: str | None,
    description: str,
    line_items: list[dict],
    currency: str = "INR",
) -> dict:
    """
    Create a Razorpay Invoice (type=invoice).

    Each line_item dict should have:
        name       str   – item name
        description str  – item description (optional)
        amount     int   – amount in paise
        quantity   int   – quantity (default 1)

    Returns the full Razorpay invoice object including `short_url`.
    """
    customer: dict = {"name": customer_name, "email": customer_email}
    if customer_phone:
        customer["contact"] = customer_phone

    payload = {
        "type": "invoice",
        "description": description,
        "customer": customer,
        "line_items": line_items,
        "currency": currency,
        # Do not auto-notify customer — admin/guest can share the link manually
        "sms_notify": 0,
        "email_notify": 0,
    }
    with httpx.Client(timeout=15) as client:
        resp = client.post(f"{_BASE_URL}/invoices", json=payload, auth=_auth())
        resp.raise_for_status()
        return resp.json()


def get_invoice(invoice_id: str) -> dict:
    """Fetch a Razorpay invoice by its ID."""
    with httpx.Client(timeout=15) as client:
        resp = client.get(f"{_BASE_URL}/invoices/{invoice_id}", auth=_auth())
        resp.raise_for_status()
        return resp.json()
