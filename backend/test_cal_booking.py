"""One-off script to test create_cal_booking and cancel_cal_booking."""
import logging
logging.basicConfig(level=logging.DEBUG)

from app.core.cal_com import create_cal_booking, cancel_cal_booking
from datetime import date, time

# Create a test booking: April 8, 10:00–12:00 IST
uid = create_cal_booking(
    booking_date=date(2026, 4, 8),
    start_time=time(10, 0),
    end_time=time(12, 0),
    name="Test User",
    email="devasudanj@gmail.com",
    confirmation_code="DZ-TEST-001",
    total_price=5000.0,
)
print(f"CREATE_UID= {uid}")

if uid:
    print("Booking created successfully! Now cancelling...")
    ok = cancel_cal_booking(uid, reason="Test run -- auto-cancel")
    print(f"CANCEL_OK= {ok}")
else:
    print("BOOKING FAILED -- check logs above")
