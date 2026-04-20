import sys, traceback
sys.path.insert(0, '/Users/dspirezone/dspirezone/backend')
from app.database import SessionLocal
from app.models import Booking
from app.routers.bookings import serialize_booking_with_payments

db = SessionLocal()
for b in db.query(Booking).limit(5):
    try:
        r = serialize_booking_with_payments(b)
        print(f'OK: {b.confirmation_code}')
    except Exception:
        print(f'FAIL: {b.confirmation_code}')
        traceback.print_exc()
db.close()
print("Done")
