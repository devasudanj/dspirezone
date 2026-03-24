"""Bare-minimum email send test to devasudanj@gmail.com via Microsoft Graph."""
import os, sys, json, ssl
from urllib import request as urllib_request, parse as urllib_parse
import certifi

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(BACKEND_DIR)
sys.path.insert(0, BACKEND_DIR)

from app.core.config import settings

TO_EMAIL = "devasudan@yahoo.com"

print("=" * 50)
print("Config check:")
print(f"  EMAIL_ENABLED  : {settings.EMAIL_ENABLED}")
print(f"  GRAPH_TENANT   : {settings.GRAPH_TENANT_ID}")
print(f"  GRAPH_CLIENT   : {settings.GRAPH_CLIENT_ID}")
print(f"  GRAPH_SECRET   : {'SET' if settings.GRAPH_CLIENT_SECRET else 'MISSING'}")
print(f"  GRAPH_SENDER   : {settings.GRAPH_SENDER_EMAIL}")
print(f"  TO             : {TO_EMAIL}")
print("=" * 50)

ssl_ctx = ssl.create_default_context(cafile=certifi.where())

# Step 1 — get token
print("\nStep 1: Getting OAuth token...")
token_url = f"https://login.microsoftonline.com/{settings.GRAPH_TENANT_ID}/oauth2/v2.0/token"
body = urllib_parse.urlencode({
    "grant_type": "client_credentials",
    "client_id": settings.GRAPH_CLIENT_ID,
    "client_secret": settings.GRAPH_CLIENT_SECRET,
    "scope": "https://graph.microsoft.com/.default",
}).encode()
req = urllib_request.Request(token_url, data=body, method="POST")
try:
    with urllib_request.urlopen(req, context=ssl_ctx, timeout=15) as resp:
        token_data = json.loads(resp.read())
        token = token_data.get("access_token")
        if token:
            print(f"  Token obtained ({len(token)} chars) ✓")
        else:
            print(f"  ERROR - no access_token in response: {token_data}")
            sys.exit(1)
except Exception as e:
    print(f"  FAILED to get token: {e}")
    sys.exit(1)

# Step 2 — send email
print(f"\nStep 2: Sending test email to {TO_EMAIL}...")
send_url = f"https://graph.microsoft.com/v1.0/users/{settings.GRAPH_SENDER_EMAIL}/sendMail"
payload = json.dumps({
    "message": {
        "subject": "DspireZone – Email delivery test",
        "body": {
            "contentType": "HTML",
            "content": "<p>This is a direct delivery test from DspireZone.</p><p>If you received this, email is working correctly.</p>",
        },
        "toRecipients": [{"emailAddress": {"address": TO_EMAIL}}],
    },
    "saveToSentItems": False,
}).encode()

req2 = urllib_request.Request(
    send_url,
    data=payload,
    headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    },
    method="POST",
)
try:
    with urllib_request.urlopen(req2, context=ssl_ctx, timeout=15) as resp:
        print(f"  Graph API status: {resp.status}")
        if resp.status in (200, 202):
            print(f"  ✓ Email accepted for delivery to {TO_EMAIL}")
        else:
            print(f"  Unexpected status {resp.status}")
except urllib_request.HTTPError as e:
    body = e.read().decode()
    print(f"  HTTP {e.code} ERROR: {body}")
    sys.exit(1)
except Exception as e:
    print(f"  FAILED: {e}")
    sys.exit(1)
