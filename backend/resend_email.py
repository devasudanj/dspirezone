"""Resend confirmation email for booking DZ-UQDVEN91, forcing guest email."""
import os, sys, sqlite3

# Ensure we run from the backend directory so .env and the DB are found
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(BACKEND_DIR)
sys.path.insert(0, BACKEND_DIR)

from app.core.email import send_booking_confirmation_emails
from app.core.config import settings

BOOKING_CODE = "DZ-UQDVEN91"
GUEST_EMAIL_OVERRIDE = "devasudanj@gmail.com"

print("EMAIL_ENABLED:", settings.EMAIL_ENABLED)
print("GRAPH_SENDER :", settings.GRAPH_SENDER_EMAIL)
print("ADMIN EMAIL  :", settings.ORDER_CONFIRMATION_ADMIN_EMAIL)

conn = sqlite3.connect(os.path.join(BACKEND_DIR, "dspirezone.db"))
conn.row_factory = sqlite3.Row

booking_row = conn.execute(
    "SELECT * FROM bookings WHERE confirmation_code=?", (BOOKING_CODE,)
).fetchone()
line_items = conn.execute(
    "SELECT * FROM booking_line_items WHERE booking_id=?", (booking_row["id"],)
).fetchall()
venue_row = conn.execute(
    "SELECT name, address FROM venues WHERE id=?", (booking_row["venue_id"],)
).fetchone()

booking = dict(booking_row)
# Override contact_email so the guest receives their copy
booking["contact_email"] = GUEST_EMAIL_OVERRIDE
booking["contact_name"] = booking["contact_name"] or "Guest"
booking["line_items"] = [dict(li) for li in line_items]
booking["price_breakdown"] = {
    "venue_subtotal": 0, "addons_subtotal": 0, "foodcourt_subtotal": 0,
    "extra_rooms_subtotal": 0, "favors_subtotal": 0,
    "total": booking["total_price"], "duration_hours": 2, "buffer_minutes": 30,
}
venue = dict(venue_row)
conn.close()

print(f"\nSending: {booking['confirmation_code']} -> {GUEST_EMAIL_OVERRIDE}")
try:
    send_booking_confirmation_emails(booking, venue)
    print("Done - check devasudanj@gmail.com inbox.")
except Exception as e:
    print(f"FAILED: {e}")
    raise
