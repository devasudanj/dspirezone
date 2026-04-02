"""
Cal.com v1 API integration for DspireZone.

Bookings created locally are mirrored to cal.com so the organiser sees
them on their calendar. Cal.com availability is also cross-checked when
returning open slots to users.

Configuration (env vars):
  CAL_API_KEY        -- Personal API key (cal_live_*). Used as ?apiKey= query param.
  CAL_BASE_URL       -- Public booking URL, e.g. https://cal.com/dspirezone/
                        Username and event slug are parsed from this URL.
  CAL_EVENT_SLUG     -- Event type slug (fallback if not in CAL_BASE_URL).
  CAL_EVENT_TYPE_ID  -- Optional. Set to skip slug lookup entirely.

All cal.com calls are best-effort: failures are logged but never block
the local booking from completing.

NOTE: cal_live_* keys authenticate via v1 API with ?apiKey= query param.
The v2 Bearer-token endpoints return 403/404 for this key type.
"""

import json
import logging
import ssl
from datetime import date, datetime, time as _time, timedelta
from typing import List, Optional, Tuple
from urllib import request as _request
from urllib.error import HTTPError
from urllib.parse import urlparse

import certifi

from .config import settings

logger = logging.getLogger(__name__)

_CAL_V1_BASE = "https://api.cal.com/v1"

# cal.com is behind Cloudflare; a standard browser UA avoids CF-1010 blocks
# when making server-side API calls.
_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)

# Asia/Kolkata = UTC+5:30
_IST_OFFSET = timedelta(hours=5, minutes=30)

# Module-level cache for the resolved event type id
_event_type_id_cache: Optional[int] = None


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------

def _ssl_ctx() -> ssl.SSLContext:
    return ssl.create_default_context(cafile=certifi.where())


def _base_headers() -> dict:
    return {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": _USER_AGENT,
    }


def _v1_url(path: str, extra_params: dict | None = None) -> str:
    """Build a v1 API URL with the apiKey query param appended."""
    params = {"apiKey": settings.CAL_API_KEY}
    if extra_params:
        params.update(extra_params)
    qs = "&".join(f"{k}={v}" for k, v in params.items())
    return f"{_CAL_V1_BASE}{path}?{qs}"


def _get(path: str, extra_params: dict | None = None) -> dict:
    url = _v1_url(path, extra_params)
    req = _request.Request(url, headers=_base_headers())
    with _request.urlopen(req, context=_ssl_ctx(), timeout=15) as resp:
        return json.loads(resp.read().decode())


def _post(path: str, body: dict) -> dict:
    url = _v1_url(path)
    data = json.dumps(body).encode()
    req = _request.Request(url, data=data, headers=_base_headers(), method="POST")
    try:
        with _request.urlopen(req, context=_ssl_ctx(), timeout=15) as resp:
            return json.loads(resp.read().decode())
    except HTTPError as exc:
        error_body = exc.read().decode()
        raise RuntimeError(f"cal.com HTTP {exc.code}: {error_body}") from exc


def _delete(path: str) -> dict:
    url = _v1_url(path)
    req = _request.Request(url, headers=_base_headers(), method="DELETE")
    try:
        with _request.urlopen(req, context=_ssl_ctx(), timeout=15) as resp:
            return json.loads(resp.read().decode())
    except HTTPError as exc:
        error_body = exc.read().decode()
        raise RuntimeError(f"cal.com HTTP {exc.code}: {error_body}") from exc


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def _is_enabled() -> bool:
    return bool(settings.CAL_API_KEY)


def _parse_cal_url() -> Tuple[str, str]:
    """
    Parse (username, event_slug) from CAL_BASE_URL.

    Examples:
      https://cal.com/dspirezone/dspirebooking  -> ("dspirezone", "dspirebooking")
      https://cal.com/dspirezone/               -> ("dspirezone", settings.CAL_EVENT_SLUG)
    """
    path = urlparse(settings.CAL_BASE_URL).path.strip("/")
    parts = [p for p in path.split("/") if p]
    username = parts[0] if len(parts) >= 1 else "dspirezone"
    slug = parts[1] if len(parts) >= 2 else settings.CAL_EVENT_SLUG
    return username, slug


def _to_utc_iso(d: date, t: _time) -> str:
    """Convert Asia/Kolkata local datetime to UTC ISO 8601 (Zulu)."""
    local_dt = datetime(d.year, d.month, d.day, t.hour, t.minute, t.second)
    utc_dt = local_dt - _IST_OFFSET
    return utc_dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")


def _utc_iso_to_ist_time(iso: str) -> Optional[_time]:
    """Parse a UTC ISO string and return the equivalent Asia/Kolkata time."""
    try:
        utc_dt = datetime.strptime(iso[:19], "%Y-%m-%dT%H:%M:%S")
        ist_dt = utc_dt + _IST_OFFSET
        return ist_dt.time()
    except ValueError:
        return None


# ---------------------------------------------------------------------------
# Event type resolution
# ---------------------------------------------------------------------------

def get_event_type_id() -> Optional[int]:
    """
    Return the cal.com event type ID for the configured event.

    Resolution order:
    1. CAL_EVENT_TYPE_ID setting (fastest -- set this to skip lookup)
    2. GET /v1/event-types?apiKey=... -- lists all event types for the key owner;
       matches by slug parsed from CAL_BASE_URL / CAL_EVENT_SLUG.

    Result is cached after first successful resolution.
    """
    global _event_type_id_cache

    if not _is_enabled():
        return None

    if settings.CAL_EVENT_TYPE_ID:
        return settings.CAL_EVENT_TYPE_ID

    if _event_type_id_cache is not None:
        return _event_type_id_cache

    _, slug = _parse_cal_url()

    try:
        data = _get("/event-types")
        event_types = data.get("event_types") or data.get("data") or []
        for et in event_types:
            if et.get("slug", "").lower() == slug.lower():
                _event_type_id_cache = int(et["id"])
                logger.info(
                    "cal.com: resolved event type slug='%s' -> id=%s",
                    slug,
                    _event_type_id_cache,
                )
                return _event_type_id_cache
        logger.warning(
            "cal.com: event type slug '%s' not found. Available: %s",
            slug,
            [et.get("slug") for et in event_types],
        )
    except Exception as exc:
        logger.warning("cal.com: event type lookup failed: %s", exc)

    return None


# ---------------------------------------------------------------------------
# Availability
# ---------------------------------------------------------------------------

def get_cal_available_times(booking_date: date, duration_minutes: int) -> Optional[List[_time]]:
    """
    Fetch available start times (in Asia/Kolkata) from cal.com for booking_date.

    Returns a list of datetime.time objects, or None if cal.com is not
    configured / the request fails (caller falls back to local availability).
    """
    if not _is_enabled():
        return None

    etype_id = get_event_type_id()
    if not etype_id:
        return None

    try:
        day_start = datetime(booking_date.year, booking_date.month, booking_date.day, 0, 0, 0)
        day_end = day_start + timedelta(days=1)
        start_utc = (day_start - _IST_OFFSET).strftime("%Y-%m-%dT%H:%M:%S.000Z")
        end_utc = (day_end - _IST_OFFSET).strftime("%Y-%m-%dT%H:%M:%S.000Z")

        # v1 slots endpoint: GET /v1/slots?apiKey=...&eventTypeId=...&startTime=...&endTime=...
        data = _get(
            "/slots",
            {
                "eventTypeId": str(etype_id),
                "startTime": start_utc,
                "endTime": end_utc,
            },
        )

        # v1 response: {"slots": {"2026-04-05": [{"time": "2026-04-05T04:00:00.000Z"}, ...]}}
        slots_by_day: dict = data.get("slots") or {}

        available: List[_time] = []
        for day_slots in slots_by_day.values():
            for slot in (day_slots if isinstance(day_slots, list) else []):
                t = _utc_iso_to_ist_time(slot.get("time", ""))
                if t is not None:
                    available.append(t)

        logger.debug(
            "cal.com: %d slot(s) available on %s (duration=%dmin)",
            len(available),
            booking_date,
            duration_minutes,
        )
        return available

    except Exception as exc:
        logger.warning("cal.com: get_cal_available_times failed for %s: %s", booking_date, exc)
        return None


# ---------------------------------------------------------------------------
# Booking
# ---------------------------------------------------------------------------

def create_cal_booking(
    booking_date: date,
    start_time: _time,
    end_time: _time,
    name: str,
    email: str,
    confirmation_code: str,
    total_price: float,
) -> Optional[str]:
    """
    Mirror a confirmed local booking to cal.com.

    Returns the cal.com booking uid string on success, or None if
    cal.com is disabled or the request fails. Failure is logged but never
    blocks the local booking -- local DB is always the source of truth.
    """
    if not _is_enabled():
        return None

    etype_id = get_event_type_id()
    if not etype_id:
        return None

    try:
        start_utc = _to_utc_iso(booking_date, start_time)

        # v1 booking payload
        # Note: cal.com v1 requires end = start + event-type-length exactly.
        # Since venue bookings have variable durations, we omit "end" and let
        # cal.com derive it from the configured event-type length (60 min).
        body = {
            "eventTypeId": etype_id,
            "start": start_utc,
            "responses": {
                "name": name,
                "email": email,
                "location": {"optionValue": "", "value": "inPerson"},
            },
            "timeZone": "Asia/Kolkata",
            "language": "en",
            "metadata": {
                "confirmation_code": confirmation_code,
                "total_price": f"INR {total_price:,.0f}",
                "source": "dspirezone-webapp",
            },
        }
        resp = _post("/bookings", body)
        # The v1 DELETE /bookings/{id} endpoint requires the numeric booking ID.
        # Store that as the reference; fall back to uid if id is absent.
        booking_id = resp.get("id")
        uid = resp.get("uid")
        ref: Optional[str] = str(booking_id) if booking_id else uid
        if ref:
            logger.info(
                "cal.com: booking created id=%s uid=%s code=%s", booking_id, uid, confirmation_code
            )
        else:
            logger.warning(
                "cal.com: booking created but id/uid missing in response: %s",
                str(resp)[:200],
            )
        return ref

    except Exception as exc:
        logger.warning(
            "cal.com: create_cal_booking failed (code=%s): %s", confirmation_code, exc
        )
        return None


def cancel_cal_booking(booking_ref: str, reason: str = "Cancelled") -> bool:
    """
    Cancel a cal.com booking.

    booking_ref -- numeric booking ID (as stored in cal_booking_uid column).
    Returns True on success, False on failure (logged, not raised).
    """
    if not _is_enabled() or not booking_ref:
        return False

    try:
        resp = _delete(f"/bookings/{booking_ref}")
        logger.info("cal.com: booking cancelled ref=%s resp=%s", booking_ref, str(resp)[:100])
        return True

    except Exception as exc:
        logger.warning("cal.com: cancel_cal_booking failed (ref=%s): %s", booking_ref, exc)
        return False
