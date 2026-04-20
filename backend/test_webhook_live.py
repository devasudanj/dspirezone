import hmac
import hashlib
import json
import urllib.request
import urllib.error
import ssl
import certifi

WEBHOOK_SECRET = "Dspirezonewh"
BASE = "https://www.dspirezone.com"

payload = {
    "event": "payment.captured",
    "payload": {
        "payment": {
            "entity": {
                "id": "pay_LiveTestVerify001",
                "order_id": "order_LiveTestVerify001",
                "amount": 150000,
                "currency": "INR",
                "status": "captured",
            }
        }
    },
}
body = json.dumps(payload, separators=(",", ":")).encode("utf-8")

sig = hmac.new(WEBHOOK_SECRET.encode("utf-8"), body, hashlib.sha256).hexdigest()
print(f"Computed HMAC signature: {sig[:16]}...")

ctx = ssl.create_default_context(cafile=certifi.where())
req = urllib.request.Request(
    f"{BASE}/api/payments/webhook",
    data=body,
    headers={
        "Content-Type": "application/json",
        "X-Razorpay-Signature": sig,
    },
    method="POST",
)

try:
    with urllib.request.urlopen(req, context=ctx, timeout=15) as r:
        resp = json.loads(r.read().decode())
        print(f"HTTP 200 — Response: {resp}")
        if resp.get("status") == "ok":
            print("PASS: webhook endpoint accepted correctly signed payload")
        else:
            print(f"NOTE: unexpected response body: {resp}")
except urllib.error.HTTPError as e:
    body_txt = e.read().decode()[:400]
    print(f"HTTP {e.code} — {body_txt}")
except Exception as ex:
    print(f"ERROR: {ex}")
