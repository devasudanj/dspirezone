"""
Quick local smoke-test for booking confirmation emails.

Usage (from backend/ directory):
    .venv/bin/python test_email_local.py [guest-email@example.com]

If no address is given it uses the SMTP_USERNAME from .env as the guest email
so you receive both the guest copy and the admin copy in the same inbox.
"""
import sys
from datetime import date, time

# Provide a guest email via CLI arg or fall back to the configured SMTP user
guest_email = sys.argv[1] if len(sys.argv) > 1 else None

# Load settings so we can fall back intelligently
from app.core.config import settings  # noqa: E402 – must follow sys.argv read

if not guest_email:
    guest_email = settings.SMTP_USERNAME or "test-guest@example.com"

from app.core.email import send_booking_confirmation_emails  # noqa: E402

FAKE_BOOKING = {
    "id": 9999,
    "confirmation_code": "DZ-TEST01",
    "date": date.today().isoformat(),
    "start_time": time(14, 0).strftime("%H:%M:%S"),
    "end_time": time(18, 0).strftime("%H:%M:%S"),
    "contact_name": "Test Guest",
    "contact_email": guest_email,
    "contact_phone": "+1-555-0100",
    "notes": "This is a test booking – please ignore.",
    "total_price": 12500.00,
    "price_breakdown": {
        "venue_subtotal": 10000.00,
        "addons_subtotal": 1500.00,
        "foodcourt_subtotal": 500.00,
        "extra_rooms_subtotal": 500.00,
        "favors_subtotal": 0.00,
        "total": 12500.00,
        "duration_hours": 4.0,
        "buffer_minutes": 30,
    },
    "line_items": [
        {
            "item_name": "Sound System",
            "item_type": "addon",
            "quantity": 1,
            "unit_label": "unit",
            "line_total": 1500.00,
        },
    ],
    "foodcourt_tables_count": 2,
    "foodcourt_table_notes": "Veg setup requested",
}

FAKE_VENUE = {
    "name": "DspireZone Banquet Hall",
    "address": "123 Main Street, Bangalore",
}

print(f"EMAIL_ENABLED : {settings.EMAIL_ENABLED}")
print(f"SMTP_HOST     : {settings.SMTP_HOST}")
print(f"SMTP_FROM     : {settings.SMTP_FROM_EMAIL}")
print(f"ADMIN email   : {settings.ORDER_CONFIRMATION_ADMIN_EMAIL}")
print(f"Guest email   : {guest_email}")
print()

if not settings.EMAIL_ENABLED:
    print("⚠  EMAIL_ENABLED is false in .env – set it to true to actually send.")
    sys.exit(1)

print("Sending emails …")
try:
    send_booking_confirmation_emails(FAKE_BOOKING, FAKE_VENUE)
    print("✓  Done – check both inboxes.")
except Exception as exc:
    print(f"✗  Error: {exc}")
    sys.exit(1)
