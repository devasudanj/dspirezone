import json
import logging
import smtplib
import ssl
from datetime import date, time
from decimal import Decimal
from email.message import EmailMessage
from html import escape
from typing import Any
from urllib import request as urllib_request, parse as urllib_parse, error as urllib_error

import certifi

from .config import settings

logger = logging.getLogger(__name__)


def _build_ssl_context() -> ssl.SSLContext:
    return ssl.create_default_context(cafile=certifi.where())


def _format_currency(amount: Any) -> str:
    try:
        value = Decimal(str(amount))
    except Exception:
        return str(amount)
    return f"Rs {value:,.2f}"


def _format_date(value: Any) -> str:
    if isinstance(value, date):
        return value.strftime("%d %b %Y")
    return str(value)


def _format_time(value: Any) -> str:
    if isinstance(value, time):
        return value.strftime("%I:%M %p")
    return str(value)


def _build_line_item_rows(booking: dict[str, Any]) -> list[str]:
    rows: list[str] = []
    for item in booking.get("line_items", []):
        quantity = item.get("quantity", 0)
        name = item.get("item_name") or item.get("item_type") or "Add-on"
        unit_label = item.get("unit_label") or "unit"
        line_total = _format_currency(item.get("line_total", 0))
        rows.append(f"- {name}: {quantity} {unit_label} | {line_total}")
    return rows


def _build_text_body(booking: dict[str, Any], venue: dict[str, Any], intro: str) -> str:
    breakdown = booking.get("price_breakdown") or {}
    line_items = _build_line_item_rows(booking)
    details = [
        intro,
        "",
        f"Confirmation code: {booking.get('confirmation_code')}",
        f"Venue: {venue.get('name')}",
        f"Address: {venue.get('address') or 'Not specified'}",
        f"Event date: {_format_date(booking.get('date'))}",
        f"Time: {_format_time(booking.get('start_time'))} to {_format_time(booking.get('end_time'))}",
        f"Booked by: {booking.get('contact_name') or 'Guest'}",
        f"Email: {booking.get('contact_email') or 'Not provided'}",
        f"Phone: {booking.get('contact_phone') or 'Not provided'}",
        "",
        "Order details:",
        f"- Venue subtotal: {_format_currency(breakdown.get('venue_subtotal', 0))}",
        f"- Food court subtotal: {_format_currency(breakdown.get('foodcourt_subtotal', 0))}",
        f"- Extra rooms subtotal: {_format_currency(breakdown.get('extra_rooms_subtotal', 0))}",
        f"- Add-ons subtotal: {_format_currency(breakdown.get('addons_subtotal', 0))}",
        f"- Favors subtotal: {_format_currency(breakdown.get('favors_subtotal', 0))}",
    ]

    if line_items:
        details.extend(["", "Selected items:", *line_items])

    if booking.get("foodcourt_tables_count"):
        details.append(f"Food court tables: {booking.get('foodcourt_tables_count')}")
    if booking.get("foodcourt_table_notes"):
        details.append(f"Food court notes: {booking.get('foodcourt_table_notes')}")
    if booking.get("notes"):
        details.extend(["", "Customer notes:", booking.get("notes")])

    details.extend([
        "",
        f"Invoice total: {_format_currency(booking.get('total_price', 0))}",
        "",
        "We will contact you if we need any clarification on the booking.",
        "",
        "DspireZone",
    ])
    return "\n".join(details)


def _build_html_body(booking: dict[str, Any], venue: dict[str, Any], intro: str) -> str:
    breakdown = booking.get("price_breakdown") or {}
    line_items = booking.get("line_items", [])
    line_items_html = "".join(
        (
            f"<tr><td style='padding:6px 0'>{escape(str(item.get('item_name') or item.get('item_type') or 'Add-on'))}</td>"
            f"<td style='padding:6px 0'>{escape(str(item.get('quantity', 0)))} {escape(str(item.get('unit_label') or 'unit'))}</td>"
            f"<td style='padding:6px 0; text-align:right'>{_format_currency(item.get('line_total', 0))}</td></tr>"
        )
        for item in line_items
    )
    notes_html = ""
    if booking.get("notes"):
        notes_html = (
            "<p style='margin:16px 0 0'><strong>Customer notes:</strong><br>"
                        f"{escape(str(booking.get('notes')))}</p>"
        )
    foodcourt_html = ""
    if booking.get("foodcourt_tables_count") or booking.get("foodcourt_table_notes"):
        foodcourt_html = (
            "<p style='margin:16px 0 0'><strong>Food court:</strong><br>"
                        f"Tables: {escape(str(booking.get('foodcourt_tables_count', 0)))}<br>"
                        f"Notes: {escape(str(booking.get('foodcourt_table_notes') or 'None'))}"
            "</p>"
        )

    return f"""
<html>
  <body style="font-family: Arial, sans-serif; color: #222; line-height: 1.5;">
        <p>{escape(intro)}</p>
    <h2 style="margin-bottom: 8px;">Booking Confirmation</h2>
        <p style="margin: 0 0 16px;">Confirmation code: <strong>{escape(str(booking.get('confirmation_code')))}</strong></p>

    <table style="border-collapse: collapse; width: 100%; max-width: 720px;">
            <tr><td style="padding: 6px 0;"><strong>Venue</strong></td><td>{escape(str(venue.get('name') or 'DspireZone'))}</td></tr>
            <tr><td style="padding: 6px 0;"><strong>Address</strong></td><td>{escape(str(venue.get('address') or 'Not specified'))}</td></tr>
            <tr><td style="padding: 6px 0;"><strong>Event date</strong></td><td>{escape(_format_date(booking.get('date')))}</td></tr>
            <tr><td style="padding: 6px 0;"><strong>Time</strong></td><td>{escape(_format_time(booking.get('start_time')))} to {escape(_format_time(booking.get('end_time')))}</td></tr>
            <tr><td style="padding: 6px 0;"><strong>Name</strong></td><td>{escape(str(booking.get('contact_name') or 'Guest'))}</td></tr>
            <tr><td style="padding: 6px 0;"><strong>Email</strong></td><td>{escape(str(booking.get('contact_email') or 'Not provided'))}</td></tr>
            <tr><td style="padding: 6px 0;"><strong>Phone</strong></td><td>{escape(str(booking.get('contact_phone') or 'Not provided'))}</td></tr>
    </table>

    <h3 style="margin: 24px 0 8px;">Invoice</h3>
    <table style="border-collapse: collapse; width: 100%; max-width: 720px;">
      <tr><td style="padding: 6px 0;">Venue subtotal</td><td style="text-align:right">{_format_currency(breakdown.get('venue_subtotal', 0))}</td></tr>
      <tr><td style="padding: 6px 0;">Food court subtotal</td><td style="text-align:right">{_format_currency(breakdown.get('foodcourt_subtotal', 0))}</td></tr>
      <tr><td style="padding: 6px 0;">Extra rooms subtotal</td><td style="text-align:right">{_format_currency(breakdown.get('extra_rooms_subtotal', 0))}</td></tr>
      <tr><td style="padding: 6px 0;">Add-ons subtotal</td><td style="text-align:right">{_format_currency(breakdown.get('addons_subtotal', 0))}</td></tr>
      <tr><td style="padding: 6px 0;">Favors subtotal</td><td style="text-align:right">{_format_currency(breakdown.get('favors_subtotal', 0))}</td></tr>
      <tr><td style="padding: 12px 0 0;"><strong>Total</strong></td><td style="padding: 12px 0 0; text-align:right"><strong>{_format_currency(booking.get('total_price', 0))}</strong></td></tr>
    </table>

    <h3 style="margin: 24px 0 8px;">Selected items</h3>
    <table style="border-collapse: collapse; width: 100%; max-width: 720px;">
      <tr><th align="left" style="padding: 6px 0; border-bottom: 1px solid #ddd;">Item</th><th align="left" style="padding: 6px 0; border-bottom: 1px solid #ddd;">Quantity</th><th align="right" style="padding: 6px 0; border-bottom: 1px solid #ddd;">Line total</th></tr>
      {line_items_html or "<tr><td colspan='3' style='padding: 8px 0;'>No add-ons selected.</td></tr>"}
    </table>

    {foodcourt_html}
    {notes_html}

    <p style="margin-top: 24px;">We will contact you if we need any clarification on the booking.</p>
    <p style="margin-top: 16px;">DspireZone</p>
  </body>
</html>
"""


def _build_message(recipient: str, subject: str, text_body: str, html_body: str) -> EmailMessage:
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    message["To"] = recipient
    message.set_content(text_body)
    message.add_alternative(html_body, subtype="html")
    return message


def _get_graph_token() -> str:
    """Obtain an OAuth2 access token via client credentials flow."""
    url = f"https://login.microsoftonline.com/{settings.GRAPH_TENANT_ID}/oauth2/v2.0/token"
    body = urllib_parse.urlencode({
        "grant_type": "client_credentials",
        "client_id": settings.GRAPH_CLIENT_ID,
        "client_secret": settings.GRAPH_CLIENT_SECRET,
        "scope": "https://graph.microsoft.com/.default",
    }).encode()
    req = urllib_request.Request(url, data=body, method="POST")
    with urllib_request.urlopen(req, context=_build_ssl_context(), timeout=15) as resp:
        return json.loads(resp.read())["access_token"]


def _send_via_graph(messages: list[EmailMessage]) -> None:
    """Send emails using Microsoft Graph POST /users/{sender}/sendMail."""
    sender = settings.GRAPH_SENDER_EMAIL
    token = _get_graph_token()
    url = f"https://graph.microsoft.com/v1.0/users/{sender}/sendMail"
    ssl_ctx = _build_ssl_context()

    for message in messages:
        recipient = message["To"]
        subject = message["Subject"]
        # Extract text and HTML parts from the EmailMessage
        text_body = ""
        html_body = ""
        if message.get_content_maintype() == "multipart":
            for part in message.iter_parts():
                ct = part.get_content_type()
                if ct == "text/plain":
                    text_body = part.get_payload(decode=True).decode("utf-8", errors="replace")
                elif ct == "text/html":
                    html_body = part.get_payload(decode=True).decode("utf-8", errors="replace")
        else:
            text_body = message.get_payload(decode=True).decode("utf-8", errors="replace")

        payload = json.dumps({
            "message": {
                "subject": subject,
                "body": {
                    "contentType": "HTML" if html_body else "Text",
                    "content": html_body or text_body,
                },
                "toRecipients": [{"emailAddress": {"address": recipient}}],
                "from": {"emailAddress": {"address": sender, "name": settings.SMTP_FROM_NAME}},
            },
            "saveToSentItems": False,
        }).encode()

        req = urllib_request.Request(
            url,
            data=payload,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urllib_request.urlopen(req, context=ssl_ctx, timeout=15) as resp:
            if resp.status not in (200, 202):
                raise RuntimeError(f"Graph sendMail returned {resp.status}")
        logger.info("Graph sendMail sent to %s", recipient)


def _send_via_smtp(messages: list[EmailMessage]) -> None:
    """Fallback SMTP sender (Basic Auth — requires Security Defaults OFF)."""
    smtp_client: smtplib.SMTP | smtplib.SMTP_SSL
    if settings.SMTP_USE_SSL:
        smtp_client = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30)
    else:
        smtp_client = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30)

    with smtp_client as server:
        server.ehlo()
        if settings.SMTP_USE_TLS and not settings.SMTP_USE_SSL:
            server.starttls(context=_build_ssl_context())
            server.ehlo()
        if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        for message in messages:
            server.send_message(message)


def _send_messages(messages: list[EmailMessage]) -> None:
    if not settings.EMAIL_ENABLED:
        logger.info("Booking email delivery skipped because EMAIL_ENABLED is false")
        return

    if settings.GRAPH_TENANT_ID and settings.GRAPH_CLIENT_ID and settings.GRAPH_CLIENT_SECRET and settings.GRAPH_SENDER_EMAIL:
        _send_via_graph(messages)
    elif settings.SMTP_HOST and settings.SMTP_FROM_EMAIL:
        _send_via_smtp(messages)
    else:
        logger.warning("Booking email delivery skipped: no Graph or SMTP credentials configured")
        return

    logger.info("Booking confirmation emails sent to %s recipient(s)", len(messages))


def send_booking_confirmation_emails(booking: dict[str, Any], venue: dict[str, Any]) -> None:
    customer_email = booking.get("contact_email")
    admin_email = settings.ORDER_CONFIRMATION_ADMIN_EMAIL
    if not customer_email and not admin_email:
        logger.info("Booking email delivery skipped because no recipients were found")
        return

    customer_intro = (
        "Thank you for your DspireZone booking. Your order has been received and the invoice details are below."
    )
    admin_intro = (
        f"A new DspireZone booking was submitted by {booking.get('contact_name') or 'a guest'}."
    )

    messages: list[EmailMessage] = []

    if customer_email:
        messages.append(
            _build_message(
                customer_email,
                f"DspireZone booking confirmation {booking.get('confirmation_code')}",
                _build_text_body(booking, venue, customer_intro),
                _build_html_body(booking, venue, customer_intro),
            )
        )

    if admin_email:
        messages.append(
            _build_message(
                admin_email,
                f"New DspireZone booking {booking.get('confirmation_code')}",
                _build_text_body(booking, venue, admin_intro),
                _build_html_body(booking, venue, admin_intro),
            )
        )

    try:
        _send_messages(messages)
    except Exception:
        logger.exception(
            "Failed to send booking confirmation emails for booking %s",
            booking.get("confirmation_code"),
        )