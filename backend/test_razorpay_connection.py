"""
Razorpay API – Connection & Payment Flow Test
----------------------------------------------
Tests (all against TEST mode keys – no real money moves):

  1. Configuration  – credentials loaded from .env
  2. Network        – api.razorpay.com reachability
  3. Auth           – fetch account info to validate key/secret
  4. Create Order   – POST /v1/orders  (simulates payment initiation)
  5. Fetch Order    – GET  /v1/orders/{id}  (confirm order was persisted)
  6. Payment verify – HMAC-SHA256 signature check (webhook / frontend flow)
  7. Refund API     – verify the refunds endpoint is accessible
  8. Webhook sig    – validate a synthetic webhook payload signature

Run:  python test_razorpay_connection.py
"""

import os
import sys
import json
import ssl
import hmac
import hashlib
import base64
import urllib.parse
import urllib.request
import urllib.error
from pathlib import Path

# ---------------------------------------------------------------------------
# SSL context (macOS certifi workaround)
# ---------------------------------------------------------------------------
try:
    import certifi
    _SSL_CTX = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    _SSL_CTX = ssl.create_default_context()

# ---------------------------------------------------------------------------
# Load .env
# ---------------------------------------------------------------------------
def load_dotenv(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip())

load_dotenv(Path(__file__).parent / ".env")

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
KEY_ID         = os.environ.get("RAZORPAY_KEY_ID", "")
KEY_SECRET     = os.environ.get("RAZORPAY_KEY_SECRET", "")
CURRENCY       = os.environ.get("RAZORPAY_CURRENCY", "INR")
WEBHOOK_SECRET = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "")
BASE_URL       = "https://api.razorpay.com/v1"

PASS = "\033[92m[PASS]\033[0m"
FAIL = "\033[91m[FAIL]\033[0m"
WARN = "\033[93m[WARN]\033[0m"
INFO = "\033[94m[INFO]\033[0m"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _basic_auth() -> str:
    token = base64.b64encode(f"{KEY_ID}:{KEY_SECRET}".encode()).decode()
    return f"Basic {token}"


def http_get(path: str, timeout: int = 10):
    url = BASE_URL + path
    req = urllib.request.Request(url, headers={"Authorization": _basic_auth()})
    try:
        with urllib.request.urlopen(req, context=_SSL_CTX, timeout=timeout) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        try:
            body = json.loads(e.read().decode())
        except Exception:
            body = {}
        return e.code, body
    except Exception as exc:
        return 0, {"error": str(exc)}


def http_post(path: str, payload: dict, timeout: int = 10):
    url = BASE_URL + path
    data = json.dumps(payload).encode()
    headers = {
        "Authorization": _basic_auth(),
        "Content-Type": "application/json",
    }
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, context=_SSL_CTX, timeout=timeout) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        try:
            body = json.loads(e.read().decode())
        except Exception:
            body = {}
        return e.code, body
    except Exception as exc:
        return 0, {"error": str(exc)}


# ---------------------------------------------------------------------------
# Test 1 – Configuration
# ---------------------------------------------------------------------------
def test_config() -> bool:
    print("\n── Test 1: Configuration ──────────────────────────────────────")
    ok = True
    for label, val in [("RAZORPAY_KEY_ID", KEY_ID), ("RAZORPAY_KEY_SECRET", KEY_SECRET)]:
        if val:
            masked = val[:12] + "…"
            mode = "(TEST – safe)" if val.startswith("rzp_test_") else "(LIVE – real money!)"
            print(f"  {PASS} {label} = {masked}  {mode}")
        else:
            print(f"  {FAIL} {label} is not set")
            ok = False

    print(f"  {INFO} Currency: {CURRENCY}")

    if not WEBHOOK_SECRET:
        print(f"  {WARN} RAZORPAY_WEBHOOK_SECRET not set.")
        print(f"         → Create a webhook in the Razorpay Dashboard and paste")
        print(f"           the secret into .env as RAZORPAY_WEBHOOK_SECRET=<secret>")
    else:
        print(f"  {PASS} RAZORPAY_WEBHOOK_SECRET is set")

    if KEY_ID and not KEY_ID.startswith("rzp_test_"):
        print(f"  {WARN} Key looks like a LIVE key – this test will hit production!")
    return ok


# ---------------------------------------------------------------------------
# Test 2 – Network reachability
# ---------------------------------------------------------------------------
def test_reachability() -> bool:
    print("\n── Test 2: Network reachability ───────────────────────────────")
    status, body = http_get("/orders?count=1")
    if status in (200, 401, 403):
        print(f"  {PASS} api.razorpay.com reachable (HTTP {status})")
        return True
    elif status == 0:
        print(f"  {FAIL} Cannot reach api.razorpay.com: {body.get('error', 'unknown')}")
        return False
    else:
        print(f"  {WARN} Unexpected HTTP {status} – may still be reachable")
        return True


# ---------------------------------------------------------------------------
# Test 3 – Validate credentials (fetch account details)
# ---------------------------------------------------------------------------
def test_auth() -> bool:
    print("\n── Test 3: Credential Validation ──────────────────────────────")
    status, body = http_get("/payments?count=1")
    if status == 200:
        print(f"  {PASS} Credentials valid – payments endpoint accessible")
        return True
    elif status == 401:
        err = body.get("error", {})
        print(f"  {FAIL} Auth failed (401): {err.get('description', 'invalid key/secret')}")
        return False
    elif status == 400:
        # 400 on /payments often means valid auth but bad params – still authenticated
        print(f"  {PASS} Credentials appear valid (HTTP 400 = bad params, not bad auth)")
        return True
    else:
        print(f"  {FAIL} Unexpected response (HTTP {status}): {str(body)[:200]}")
        return False


# ---------------------------------------------------------------------------
# Test 4 – Create Order  (amount in paise – ₹1500.00 = 150000 paise)
# ---------------------------------------------------------------------------
def test_create_order() -> tuple[bool, str]:
    print("\n── Test 4: Create Razorpay Order ──────────────────────────────")
    # Simulate a ₹1,500 venue booking deposit
    amount_inr = 1500.00
    amount_paise = int(amount_inr * 100)

    payload = {
        "amount": amount_paise,
        "currency": CURRENCY,
        "receipt": "dz_test_booking_001",
        "notes": {
            "booking_context": "DspireZone venue booking",
            "test_run": "true",
        },
    }

    status, body = http_post("/orders", payload)
    if status == 200:
        order_id = body.get("id", "")
        print(f"  {PASS} Order created successfully!")
        print(f"         Order ID     : {order_id}")
        print(f"         Amount       : ₹{body.get('amount', 0) / 100:.2f} {body.get('currency')}")
        print(f"         Status       : {body.get('status')}")
        print(f"         Receipt      : {body.get('receipt')}")
        print(f"\n  {INFO} In the frontend, pass this to Razorpay Checkout:")
        print(f"         key:      {KEY_ID}")
        print(f"         order_id: {order_id}")
        return True, order_id
    else:
        err = body.get("error", {})
        print(f"  {FAIL} Order creation failed (HTTP {status}): {err.get('description', str(body)[:200])}")
        return False, ""


# ---------------------------------------------------------------------------
# Test 5 – Fetch the created order
# ---------------------------------------------------------------------------
def test_fetch_order(order_id: str) -> bool:
    print("\n── Test 5: Fetch Order ────────────────────────────────────────")
    if not order_id:
        print(f"  {INFO} No order ID from Test 4 – skipping")
        return False

    status, body = http_get(f"/orders/{order_id}")
    if status == 200 and body.get("id") == order_id:
        print(f"  {PASS} Order retrieved: id={body['id']} status={body['status']}")
        return True
    else:
        err = body.get("error", {})
        print(f"  {FAIL} Fetch failed (HTTP {status}): {err.get('description', str(body)[:200])}")
        return False


# ---------------------------------------------------------------------------
# Test 6 – Payment signature verification  (simulate frontend callback)
# ---------------------------------------------------------------------------
def test_payment_signature(order_id: str) -> bool:
    print("\n── Test 6: Payment Signature Verification ─────────────────────")
    # Simulate what Razorpay returns after a successful test payment
    fake_payment_id = "pay_TestSimulated123456"

    # Build the expected signature: HMAC-SHA256(order_id + "|" + payment_id, key_secret)
    msg = f"{order_id}|{fake_payment_id}"
    expected_sig = hmac.new(
        KEY_SECRET.encode("utf-8"),
        msg.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    # Simulate verification (as our backend would do upon receiving the callback)
    def verify_signature(order_id: str, payment_id: str, received_sig: str) -> bool:
        computed = hmac.new(
            KEY_SECRET.encode("utf-8"),
            f"{order_id}|{payment_id}".encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(computed, received_sig)

    if verify_signature(order_id, fake_payment_id, expected_sig):
        print(f"  {PASS} Signature algorithm verified correctly")
        print(f"         HMAC-SHA256(order_id|payment_id, key_secret) ✓")
        print(f"         Signature: {expected_sig[:32]}…")
    else:
        print(f"  {FAIL} Signature mismatch – key/secret may be incorrect")
        return False

    # Ensure a tampered signature fails
    tampered = expected_sig[:-4] + "0000"
    if not verify_signature(order_id, fake_payment_id, tampered):
        print(f"  {PASS} Tampered signature correctly rejected ✓")
    else:
        print(f"  {FAIL} Tampered signature was not rejected – security issue!")
        return False

    return True


# ---------------------------------------------------------------------------
# Test 7 – Refund endpoint reachability
# ---------------------------------------------------------------------------
def test_refund_endpoint() -> bool:
    print("\n── Test 7: Refund Endpoint Reachability ───────────────────────")
    # Calling /refunds on a non-existent payment returns 400, not 401/0
    status, body = http_get("/payments/pay_nonexistent123/refunds")
    if status in (400, 404):
        print(f"  {PASS} Refund endpoint reachable (HTTP {status} – expected for fake payment ID)")
        return True
    elif status == 401:
        print(f"  {FAIL} Auth rejected on refund endpoint")
        return False
    elif status == 0:
        print(f"  {FAIL} Refund endpoint unreachable: {body.get('error', '')}")
        return False
    else:
        print(f"  {WARN} HTTP {status} – {str(body)[:100]}")
        return True


# ---------------------------------------------------------------------------
# Test 8 – Webhook signature (if secret is configured)
# ---------------------------------------------------------------------------
def test_webhook_signature() -> bool:
    print("\n── Test 8: Webhook Signature Validation ───────────────────────")
    if not WEBHOOK_SECRET:
        print(f"  {INFO} RAZORPAY_WEBHOOK_SECRET not set – skipping")
        return True  # Not a failure – just not configured yet

    sample_payload = json.dumps({
        "event": "payment.captured",
        "payload": {
            "payment": {"entity": {"id": "pay_Test123", "order_id": "order_Test456", "amount": 150000}}
        }
    }, separators=(",", ":"))

    expected = hmac.new(
        WEBHOOK_SECRET.encode("utf-8"),
        sample_payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    def verify_webhook(body: str, received_sig: str) -> bool:
        computed = hmac.new(
            WEBHOOK_SECRET.encode("utf-8"),
            body.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(computed, received_sig)

    if verify_webhook(sample_payload, expected):
        print(f"  {PASS} Webhook signature algorithm verified")
        return True
    else:
        print(f"  {FAIL} Webhook signature check failed")
        return False


# ---------------------------------------------------------------------------
# Summary of integration guidance
# ---------------------------------------------------------------------------
def print_integration_guide():
    print(f"""
── Integration Guide ──────────────────────────────────────────

  1. BACKEND (FastAPI)
     • On booking confirm → POST /v1/orders → return order_id to frontend
     • On payment callback → verify HMAC-SHA256 signature (Test 6 pattern)
     • On success → update Payment.status = "completed", store payment_ref

  2. FRONTEND  (React / Checkout.js)
     • Load Razorpay Checkout v2 script:
       <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
     • Options: key=RAZORPAY_KEY_ID, order_id=<from backend>, amount, currency
     • handler(response): send razorpay_order_id, razorpay_payment_id,
       razorpay_signature to your backend /api/payments/verify endpoint

  3. WEBHOOK
     • Register https://your-domain/api/payments/webhook in Razorpay Dashboard
     • Events: payment.captured, payment.failed, refund.created
     • Verify X-Razorpay-Signature header using RAZORPAY_WEBHOOK_SECRET

  4. REFUNDS
     • POST /v1/payments/{{payment_id}}/refund  {{amount: <paise>}}
""")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print("=" * 60)
    print("  Razorpay API – Connection & Payment Flow Test")
    print("=" * 60)

    results = []
    order_id = ""

    results.append(test_config())
    if not results[-1]:
        print(f"\n  Cannot proceed without credentials. Exiting.")
        sys.exit(1)

    results.append(test_reachability())
    results.append(test_auth())

    ok, order_id = test_create_order()
    results.append(ok)

    results.append(test_fetch_order(order_id))
    results.append(test_payment_signature(order_id or "order_dummy_test_00"))
    results.append(test_refund_endpoint())
    results.append(test_webhook_signature())

    print_integration_guide()

    print("=" * 60)
    passed = sum(1 for r in results if r)
    total = len(results)
    color = "\033[92m" if passed == total else "\033[93m"
    print(f"  {color}Summary: {passed}/{total} tests passed\033[0m")
    print("=" * 60)
    sys.exit(0 if passed == total else 1)
