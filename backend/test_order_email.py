import logging
logging.basicConfig(level=logging.DEBUG, format='%(levelname)s %(name)s: %(message)s')

from app.database import SessionLocal
from app.models import Booking, Venue
from app.routers.bookings import serialize_booking
from app.core.email import send_booking_reminder_email, _get_graph_token, _build_ssl_context
from app.core.config import settings
import json
from urllib import request as urllib_request

# Print key settings
print('EMAIL_ENABLED=', settings.EMAIL_ENABLED)
print('GRAPH_SENDER=', settings.GRAPH_SENDER_EMAIL)

# Get and validate Graph token
try:
    token = _get_graph_token()
    print('GRAPH_TOKEN=OK (obtained)')
except Exception as e:
    print('GRAPH_TOKEN=FAILED:', e)
    raise

# Direct Graph API test send
url = f'https://graph.microsoft.com/v1.0/users/{settings.GRAPH_SENDER_EMAIL}/sendMail'
import datetime as dt
subject = 'DspireZone order email test ' + dt.datetime.now(dt.UTC).isoformat()
payload = json.dumps({
    'message': {
        'subject': subject,
        'body': {'contentType': 'Text', 'content': 'Order email resend test from DspireZone backend.'},
        'toRecipients': [{'emailAddress': {'address': 'devasudanj@gmail.com'}}],
    },
    'saveToSentItems': True,
}).encode()
req = urllib_request.Request(url, data=payload, headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'}, method='POST')
with urllib_request.urlopen(req, context=_build_ssl_context(), timeout=20) as resp:
    print('DIRECT_GRAPH_STATUS=', resp.status)
    print('SUBJECT=', subject)

# Now send via the actual app email function using booking data
db = SessionLocal()
b = db.query(Booking).order_by(Booking.id.desc()).first()
v = db.get(Venue, b.venue_id) if b else None
d = serialize_booking(b).model_dump(mode='json') if b else {}
vd = {'name': v.name if v else 'DspireZone', 'address': v.address if v else ''}

extra = ['devasudan@yahoo.com']
print('BOOKING_ID=', b.id)
print('CONFIRMATION=', b.confirmation_code)
print('ORIGINAL_CONTACT_EMAIL=', d.get('contact_email'))
print('SENDING_TO=', extra)
send_booking_reminder_email(d, vd, extra)
print('APP_EMAIL_SEND=OK')
