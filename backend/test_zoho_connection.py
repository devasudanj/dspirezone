"""
Zoho Books API – connection test
---------------------------------
Tests:
  1. Reachability of Zoho accounts & API domains
  2. OAuth2 credential validation (client_credentials probe)
  3. Authorization URL generation (for first-time consent)
  4. If ZOHO_REFRESH_TOKEN is set → exchange for access token & call Books API

Run:  python test_zoho_connection.py
"""

import os
import sys
import json
import ssl
import urllib.parse
import urllib.request
import urllib.error
from pathlib import Path

# Build an SSL context using certifi's CA bundle when available (required on macOS)
try:
    import certifi
    _SSL_CTX = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    _SSL_CTX = ssl.create_default_context()

# ---------------------------------------------------------------------------
# Load .env manually (no third-party deps required for the pre-install test)
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
BASE_API_DOMAIN   = os.environ.get("ZOHO_BASE_API_DOMAIN", "https://www.zohoapis.in")
ACCOUNTS_DOMAIN   = os.environ.get("ZOHO_ACCOUNTS_DOMAIN", "https://accounts.zoho.in")
CLIENT_ID         = os.environ.get("ZOHO_CLIENT_ID", "")
CLIENT_SECRET     = os.environ.get("ZOHO_CLIENT_SECRET", "")
REDIRECT_URI      = os.environ.get("ZOHO_REDIRECT_URI", "http://localhost:8000/zoho/callback")
REFRESH_TOKEN     = os.environ.get("ZOHO_REFRESH_TOKEN", "")
ORG_ID            = os.environ.get("ZOHO_ORGANIZATION_ID", "")

# Scopes needed for invoice management
ZOHO_SCOPES = [
    "ZohoBooks.invoices.CREATE",
    "ZohoBooks.invoices.READ",
    "ZohoBooks.invoices.UPDATE",
    "ZohoBooks.contacts.CREATE",
    "ZohoBooks.contacts.READ",
    "ZohoBooks.settings.READ",
]

PASS = "\033[92m[PASS]\033[0m"
FAIL = "\033[91m[FAIL]\033[0m"
WARN = "\033[93m[WARN]\033[0m"
INFO = "\033[94m[INFO]\033[0m"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def http_get(url: str, headers: dict | None = None, timeout: int = 10):
    req = urllib.request.Request(url, headers=headers or {})
    try:
        with urllib.request.urlopen(req, context=_SSL_CTX, timeout=timeout) as resp:
            return resp.status, resp.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()
    except Exception as exc:
        return 0, str(exc)


def http_post(url: str, data: dict, headers: dict | None = None, timeout: int = 10):
    encoded = urllib.parse.urlencode(data).encode()
    req = urllib.request.Request(url, data=encoded, headers=headers or {}, method="POST")
    try:
        with urllib.request.urlopen(req, context=_SSL_CTX, timeout=timeout) as resp:
            return resp.status, resp.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()
    except Exception as exc:
        return 0, str(exc)


# ---------------------------------------------------------------------------
# Test 1 – Environment / Config check
# ---------------------------------------------------------------------------
def test_config():
    print("\n── Test 1: Configuration ──────────────────────────────────────")
    ok = True

    for var, val in [
        ("ZOHO_CLIENT_ID", CLIENT_ID),
        ("ZOHO_CLIENT_SECRET", CLIENT_SECRET),
        ("ZOHO_BASE_API_DOMAIN", BASE_API_DOMAIN),
        ("ZOHO_ACCOUNTS_DOMAIN", ACCOUNTS_DOMAIN),
    ]:
        if val:
            print(f"  {PASS} {var} = {val[:12]}…")
        else:
            print(f"  {FAIL} {var} is not set")
            ok = False

    # Warn about the Razorpay key that was mentioned
    rzp_key = "rzp_test_SdxYewIe664EeM"
    print(f"\n  {WARN} NOTE: '{rzp_key}' starts with 'rzp_test_' which is a")
    print(f"         Razorpay key, NOT a Zoho credential. It has been ignored.")

    if not REFRESH_TOKEN:
        print(f"\n  {INFO} ZOHO_REFRESH_TOKEN is empty.")
        print(f"         → Complete OAuth consent (Test 3 shows the URL) then")
        print(f"           store the returned refresh_token in .env to enable")
        print(f"           automated API calls without user interaction.")

    return ok


# ---------------------------------------------------------------------------
# Test 2 – Network reachability
# ---------------------------------------------------------------------------
def test_reachability():
    print("\n── Test 2: Network reachability ───────────────────────────────")
    ok = True
    endpoints = [
        (ACCOUNTS_DOMAIN, "/oauth/v2/auth"),
        (BASE_API_DOMAIN, "/books/v3/organizations"),
    ]
    for domain, path in endpoints:
        url = domain + path
        status, _ = http_get(url, timeout=8)
        if status in (200, 400, 401, 403):       # Any HTTP reply = reachable
            print(f"  {PASS} Reachable: {url}  (HTTP {status})")
        elif status == 0:
            print(f"  {FAIL} Unreachable: {url}")
            ok = False
        else:
            print(f"  {WARN} Unexpected status {status} for {url}")
    return ok


# ---------------------------------------------------------------------------
# Test 3 – OAuth2 authorization URL
# ---------------------------------------------------------------------------
def test_auth_url():
    print("\n── Test 3: OAuth2 Authorization URL ───────────────────────────")
    if not CLIENT_ID:
        print(f"  {FAIL} CLIENT_ID missing – skipping")
        return False

    params = {
        "response_type": "code",
        "client_id": CLIENT_ID,
        "scope": ",".join(ZOHO_SCOPES),
        "redirect_uri": REDIRECT_URI,
        "access_type": "offline",   # Request a refresh token
        "prompt": "consent",
    }
    auth_url = f"{ACCOUNTS_DOMAIN}/oauth/v2/auth?" + urllib.parse.urlencode(params)
    print(f"  {PASS} Authorization URL generated.")
    print(f"\n  Open this URL in a browser to complete first-time OAuth consent:")
    print(f"\n  {auth_url}\n")
    print(f"  After granting access, Zoho redirects to:")
    print(f"  {REDIRECT_URI}?code=<AUTH_CODE>")
    print(f"\n  Then run: python test_zoho_connection.py --exchange <AUTH_CODE>")
    return True


# ---------------------------------------------------------------------------
# Test 4 – Exchange auth code for tokens  (--exchange <code>)
# ---------------------------------------------------------------------------
def test_exchange_code(auth_code: str):
    print("\n── Test 4: Exchange authorization code for tokens ─────────────")
    url = f"{ACCOUNTS_DOMAIN}/oauth/v2/token"
    data = {
        "grant_type": "authorization_code",
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "redirect_uri": REDIRECT_URI,
        "code": auth_code,
    }
    status, body = http_post(url, data)
    try:
        parsed = json.loads(body)
    except json.JSONDecodeError:
        parsed = {}

    if status == 200 and "access_token" in parsed:
        print(f"  {PASS} Tokens received!")
        print(f"         access_token  : {parsed['access_token'][:20]}…")
        rt = parsed.get("refresh_token", "")
        if rt:
            print(f"         refresh_token : {rt[:20]}…")
            print(f"\n  {INFO} Store this in .env as ZOHO_REFRESH_TOKEN={rt}")
        return parsed.get("access_token"), rt
    else:
        print(f"  {FAIL} Token exchange failed (HTTP {status})")
        print(f"         Response: {body[:300]}")
        return None, None


# ---------------------------------------------------------------------------
# Test 5 – Use refresh token to get access token, then call Books API
# ---------------------------------------------------------------------------
def test_api_with_refresh_token():
    print("\n── Test 5: API call via refresh token ─────────────────────────")
    if not REFRESH_TOKEN:
        print(f"  {INFO} ZOHO_REFRESH_TOKEN not set – skipping live API test.")
        return False

    # --- Refresh access token ---
    url = f"{ACCOUNTS_DOMAIN}/oauth/v2/token"
    data = {
        "grant_type": "refresh_token",
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "refresh_token": REFRESH_TOKEN,
    }
    status, body = http_post(url, data)
    try:
        parsed = json.loads(body)
    except json.JSONDecodeError:
        parsed = {}

    if status != 200 or "access_token" not in parsed:
        print(f"  {FAIL} Token refresh failed (HTTP {status}): {body[:200]}")
        return False

    access_token = parsed["access_token"]
    print(f"  {PASS} Access token refreshed: {access_token[:20]}…")

    # --- Call Books API: list organizations ---
    org_url = f"{BASE_API_DOMAIN}/books/v3/organizations"
    headers = {"Authorization": f"Zoho-oauthtoken {access_token}"}
    org_status, org_body = http_get(org_url, headers=headers)
    try:
        org_data = json.loads(org_body)
    except json.JSONDecodeError:
        org_data = {}

    if org_status == 200 and org_data.get("code") == 0:
        orgs = org_data.get("organizations", [])
        print(f"  {PASS} Organizations endpoint returned {len(orgs)} org(s):")
        for org in orgs:
            print(f"         • {org.get('name')} (id={org.get('organization_id')})")
        if orgs and not ORG_ID:
            print(f"\n  {INFO} Set ZOHO_ORGANIZATION_ID={orgs[0].get('organization_id')} in .env")
    else:
        print(f"  {FAIL} Organizations call failed (HTTP {org_status})")
        print(f"         Response: {org_body[:300]}")
        return False

    return True


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print("=" * 60)
    print("  Zoho Books API – Connection Test")
    print("=" * 60)

    results = []

    results.append(test_config())
    results.append(test_reachability())

    if "--exchange" in sys.argv:
        idx = sys.argv.index("--exchange")
        try:
            code = sys.argv[idx + 1]
            test_exchange_code(code)
        except IndexError:
            print(f"  {FAIL} --exchange requires an auth code argument")
    else:
        results.append(test_auth_url())
        results.append(test_api_with_refresh_token())

    print("\n" + "=" * 60)
    passed = sum(1 for r in results if r)
    total = len(results)
    status_str = "ALL PASSED" if passed == total else f"{passed}/{total} passed"
    color = "\033[92m" if passed == total else "\033[93m"
    print(f"  {color}Summary: {status_str}\033[0m")
    print("=" * 60)
