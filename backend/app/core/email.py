import base64
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

try:
    from fpdf import FPDF as _FPDF  # type: ignore
    _FPDF_AVAILABLE = True
except ImportError:
    _FPDF_AVAILABLE = False

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


def _build_text_body(booking: dict[str, Any], venue: dict[str, Any], intro: str, modify_link: str = "") -> str:
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
    ])

    if modify_link:
        details.extend([
            "",
            "Modify or update your booking (including remaining balance payment):",
            modify_link,
        ])

    details.extend([
        "",
        "We will contact you if we need any clarification on the booking.",
        "",
        "DspireZone",
    ])
    return "\n".join(details)


def _build_html_body(booking: dict[str, Any], venue: dict[str, Any], intro: str, modify_link: str = "") -> str:
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

    modify_html = ""
    if modify_link:
        modify_html = f"""
    <div style="margin:28px 0 0; padding:16px; background:#f5f0ff; border-radius:8px; border-left:4px solid #7c3aed;">
      <p style="margin:0 0 8px; font-weight:bold;">Modify or Update Your Booking</p>
      <p style="margin:0 0 12px; color:#555; font-size:14px;">
        You can update your booking details, add selections, or pay your remaining balance using the link below.
        Your confirmation code is required: <strong>{escape(str(booking.get('confirmation_code')))}</strong>
      </p>
      <a href="{escape(modify_link)}" style="display:inline-block; padding:10px 20px; background:#7c3aed; color:#fff; text-decoration:none; border-radius:6px; font-weight:bold;">
        View &amp; Modify Booking
      </a>
      <p style="margin:10px 0 0; font-size:12px; color:#888;">Or copy this link: {escape(modify_link)}</p>
    </div>"""

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
    {modify_html}

    <p style="margin-top: 24px;">We will contact you if we need any clarification on the booking.</p>
    <p style="margin-top: 16px;">DspireZone</p>
  </body>
</html>
"""


def _build_message(
    recipient: str,
    subject: str,
    text_body: str,
    html_body: str,
    attachments: list[tuple[str, bytes]] | None = None,  # [(filename, pdf_bytes)]
) -> EmailMessage:
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    message["To"] = recipient
    message.set_content(text_body)
    message.add_alternative(html_body, subtype="html")
    for filename, data in (attachments or []):
        message.add_attachment(data, maintype="application", subtype="pdf", filename=filename)
    return message


def _extract_email_parts(message: EmailMessage) -> tuple[str, str, list[dict]]:
    """Walk the MIME tree and extract (text_body, html_body, graph_attachments)."""
    text_body: str = ""
    html_body: str = ""
    graph_attachments: list[dict] = []

    def _walk(msg: EmailMessage) -> None:
        nonlocal text_body, html_body
        ct = msg.get_content_type()
        disposition = msg.get_content_disposition()
        if disposition == "attachment":
            fname = msg.get_filename() or "attachment"
            raw = msg.get_payload(decode=True)
            graph_attachments.append({
                "@odata.type": "#microsoft.graph.fileAttachment",
                "name": fname,
                "contentType": ct,
                "contentBytes": base64.b64encode(raw).decode("ascii"),
            })
        elif ct == "text/plain" and not text_body:
            text_body = msg.get_payload(decode=True).decode("utf-8", errors="replace")
        elif ct == "text/html" and not html_body:
            html_body = msg.get_payload(decode=True).decode("utf-8", errors="replace")
        elif msg.get_content_maintype() == "multipart":
            for part in msg.iter_parts():
                _walk(part)  # type: ignore[arg-type]

    _walk(message)
    return text_body, html_body, graph_attachments


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
        text_body, html_body, graph_attachments = _extract_email_parts(message)

        msg_payload: dict[str, Any] = {
            "subject": subject,
            "body": {
                "contentType": "HTML" if html_body else "Text",
                "content": html_body or text_body,
            },
            "toRecipients": [{"emailAddress": {"address": recipient}}],
            "from": {"emailAddress": {"address": sender, "name": settings.SMTP_FROM_NAME}},
        }
        if graph_attachments:
            msg_payload["attachments"] = graph_attachments

        payload = json.dumps({"message": msg_payload, "saveToSentItems": False}).encode()

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

    modify_link = f"{settings.SITE_BASE_URL}/modify-booking/{booking.get('confirmation_code')}"

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
                _build_text_body(booking, venue, customer_intro, modify_link),
                _build_html_body(booking, venue, customer_intro, modify_link),
            )
        )

    if admin_email:
        messages.append(
            _build_message(
                admin_email,
                f"New DspireZone booking {booking.get('confirmation_code')}",
                _build_text_body(booking, venue, admin_intro, modify_link),
                _build_html_body(booking, venue, admin_intro, modify_link),
            )
        )

    try:
        _send_messages(messages)
    except Exception:
        logger.exception(
            "Failed to send booking confirmation emails for booking %s",
            booking.get("confirmation_code"),
        )


def send_booking_reminder_email(
    booking: dict[str, Any],
    venue: dict[str, Any],
    extra_recipients: list[str] | None = None,
    raise_on_error: bool = False,
) -> None:
    """Send a booking details reminder email to customer + any alt email addresses.

    Called manually from the admin portal. Includes the modify/payment link.
    Set raise_on_error=True to surface exceptions to the caller instead of swallowing them.
    """
    recipients: list[str] = []
    if booking.get("contact_email"):
        recipients.append(booking["contact_email"])
    for addr in (extra_recipients or []):
        if addr and addr not in recipients:
            recipients.append(addr)

    if not recipients:
        logger.warning("Reminder email skipped: no recipients for booking %s", booking.get("confirmation_code"))
        return

    modify_link = f"{settings.SITE_BASE_URL}/modify-booking/{booking.get('confirmation_code')}"
    intro = (
        "Here is a summary of your DspireZone booking. "
        "You can use the link below to view, update your order, or pay your remaining balance."
    )

    messages: list[EmailMessage] = [
        _build_message(
            recipient,
            f"Your DspireZone booking – {booking.get('confirmation_code')}",
            _build_text_body(booking, venue, intro, modify_link),
            _build_html_body(booking, venue, intro, modify_link),
        )
        for recipient in recipients
    ]

    try:
        _send_messages(messages)
    except Exception:
        logger.exception(
            "Failed to send reminder emails for booking %s",
            booking.get("confirmation_code"),
        )
        if raise_on_error:
            raise


# ---------------------------------------------------------------------------
# PDF invoice generation (requires fpdf2 – gracefully skipped if not installed)
# ---------------------------------------------------------------------------

def _pdf_row(pdf: Any, label: str, amount: float, bold: bool = False, color: tuple = (33, 33, 33)) -> None:
    """Render a label + right-aligned amount row inside the PDF."""
    font_style = "B" if bold else ""
    pdf.set_font("Helvetica", font_style, 10)
    pdf.set_text_color(*color)
    pdf.cell(130, 7, _pdf_safe(label), border="LR", ln=False)
    pdf.cell(0, 7, _format_currency(amount), border="LR", align="R", ln=True)


def _pdf_safe(text: str) -> str:
    """Replace Unicode characters unsupported by Helvetica (Latin-1) with ASCII equivalents."""
    replacements = {
        "\u2013": "-",   # en dash
        "\u2014": "-",   # em dash
        "\u2192": "->",  # right arrow
        "\u2190": "<-",  # left arrow
        "\u20b9": "Rs",  # Indian Rupee sign
        "\u2019": "'",   # right single quote
        "\u2018": "'",   # left single quote
        "\u201c": '"',   # left double quote
        "\u201d": '"',   # right double quote
        "\u2026": "...", # ellipsis
        "\u2022": "-",   # bullet
    }
    for char, repl in replacements.items():
        text = text.replace(char, repl)
    return text.encode("latin-1", errors="replace").decode("latin-1")


def _pdf_section_header(pdf: Any, title: str, purple: tuple) -> None:
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(*purple)
    pdf.cell(0, 7, title, ln=True)
    pdf.set_draw_color(*purple)
    y = pdf.get_y()
    pdf.line(15, y, 195, y)
    pdf.ln(3)
    pdf.set_text_color(33, 33, 33)


def _generate_event_invoice_pdf(booking: dict[str, Any], venue: dict[str, Any], changes_summary: str = "") -> bytes | None:
    """Generate an event invoice PDF from current booking data. Returns None if fpdf2 is unavailable."""
    if not _FPDF_AVAILABLE:
        logger.warning("fpdf2 not installed – skipping event invoice PDF attachment")
        return None

    PURPLE = (124, 58, 237)
    DARK = (33, 33, 33)
    GREY = (100, 100, 100)

    inv_seq = str(booking.get("id", 0)).zfill(5)
    inv_ref = f"DZ/E/{inv_seq}"
    code = str(booking.get("confirmation_code", ""))
    breakdown: dict = booking.get("price_breakdown") or {}
    line_items: list = booking.get("line_items") or []

    pdf = _FPDF()
    pdf.set_margins(15, 20, 15)
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=20)

    # ── Header ──────────────────────────────────────────────────────
    pdf.set_font("Helvetica", "B", 20)
    pdf.set_text_color(*PURPLE)
    pdf.cell(0, 10, "DspireZone", ln=True)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*GREY)
    pdf.cell(0, 5, _pdf_safe(str(venue.get("address") or "Event Venue")), ln=True)
    pdf.ln(4)

    # ── Banner ──────────────────────────────────────────────────────
    pdf.set_fill_color(*PURPLE)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 10, "EVENT INVOICE  |  BOOKING MODIFICATION CONFIRMATION", fill=True, ln=True, align="C")
    pdf.ln(5)

    # ── Invoice meta ────────────────────────────────────────────────
    pdf.set_text_color(*DARK)
    for label, val in [
        ("Invoice Ref", inv_ref),
        ("Confirmation Code", code),
        ("Event Date", _format_date(booking.get("date"))),
        ("Time", f"{_format_time(booking.get('start_time'))} to {_format_time(booking.get('end_time'))}"),
        ("Venue", str(venue.get("name") or "DspireZone")),
    ]:
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(50, 7, f"{label}:", ln=False)
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(0, 7, _pdf_safe(str(val)), ln=True)
    pdf.ln(4)
    pdf.set_draw_color(*PURPLE)
    pdf.line(15, pdf.get_y(), 195, pdf.get_y())
    pdf.ln(4)

    # ── Billed To ───────────────────────────────────────────────────
    _pdf_section_header(pdf, "BILLED TO", PURPLE)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 6, _pdf_safe(str(booking.get("contact_name") or "Guest")), ln=True)
    pdf.set_font("Helvetica", "", 10)
    if booking.get("contact_email"):
        pdf.cell(0, 5, _pdf_safe(str(booking["contact_email"])), ln=True)
    if booking.get("contact_phone"):
        pdf.cell(0, 5, _pdf_safe(str(booking["contact_phone"])), ln=True)
    pdf.ln(5)

    # ── Line items table ────────────────────────────────────────────
    pdf.set_fill_color(240, 234, 255)
    pdf.set_text_color(*DARK)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(130, 8, "Description", fill=True, border=1, ln=False)
    pdf.cell(0, 8, "Amount", fill=True, border=1, align="C", ln=True)

    pdf.set_font("Helvetica", "", 10)
    venue_sub = float(breakdown.get("venue_subtotal") or 0)
    duration_h = float(breakdown.get("duration_hours") or 0)
    if venue_sub > 0:
        label = f"Event Space ({duration_h:g} hr)" if duration_h > 0 else "Event Space"
        pdf.cell(130, 7, label, border="LR", ln=False)
        pdf.cell(0, 7, _format_currency(venue_sub), border="LR", align="R", ln=True)

    extra_sub = float(breakdown.get("extra_rooms_subtotal") or 0)
    if extra_sub > 0:
        n = booking.get("extra_rooms_count") or ""
        pdf.cell(130, 7, f"Extra Room(s) x {n}", border="LR", ln=False)
        pdf.cell(0, 7, _format_currency(extra_sub), border="LR", align="R", ln=True)

    fc_sub = float(breakdown.get("foodcourt_subtotal") or 0)
    if fc_sub > 0:
        n = booking.get("foodcourt_tables_count") or ""
        pdf.cell(130, 7, f"Food Court Table(s) x {n}", border="LR", ln=False)
        pdf.cell(0, 7, _format_currency(fc_sub), border="LR", align="R", ln=True)

    for item in line_items:
        name = _pdf_safe(str(item.get("item_name") or "Add-on"))
        qty = item.get("quantity") or 1
        line_total = float(item.get("line_total") or 0)
        if line_total > 0:
            label = f"{name} x {int(qty)}" if float(qty) != 1 else name
            pdf.cell(130, 7, label, border="LR", ln=False)
            pdf.cell(0, 7, _format_currency(line_total), border="LR", align="R", ln=True)

    # Discount
    discount_pct = float(booking.get("discount_pct") or 0)
    discount_code_str = booking.get("discount_code")
    discount_saving = 0.0
    if discount_pct > 0 and discount_code_str:
        discount_saving = round(venue_sub * discount_pct / 100, 2)
        pdf.set_text_color(0, 130, 0)
        pdf.cell(130, 7, _pdf_safe(f"Discount - {discount_code_str} ({discount_pct:.0f}% off venue)"), border="LR", ln=False)
        pdf.cell(0, 7, f"-{_format_currency(discount_saving)}", border="LR", align="R", ln=True)
        pdf.set_text_color(*DARK)

    pretax_total = float(breakdown.get("total") or 0) - discount_saving
    cgst = round(pretax_total * 0.09, 2)
    sgst = round(pretax_total * 0.09, 2)
    event_total = round(pretax_total * 1.18, 2)

    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(130, 7, "Subtotal (pre-GST)", border="LR", ln=False)
    pdf.cell(0, 7, _format_currency(pretax_total), border="LR", align="R", ln=True)
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(130, 7, "CGST @ 9% (Tamil Nadu)", border="LR", ln=False)
    pdf.cell(0, 7, _format_currency(cgst), border="LR", align="R", ln=True)
    pdf.cell(130, 7, "SGST @ 9% (Tamil Nadu)", border="LR", ln=False)
    pdf.cell(0, 7, _format_currency(sgst), border="LR", align="R", ln=True)

    pdf.set_fill_color(240, 234, 255)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(130, 9, "EVENT INVOICE TOTAL", fill=True, border=1, ln=False)
    pdf.cell(0, 9, _format_currency(event_total), fill=True, border=1, align="R", ln=True)

    # ── Payment summary ─────────────────────────────────────────────
    pdf.ln(5)
    _pdf_section_header(pdf, "PAYMENT SUMMARY", PURPLE)
    total_price = float(booking.get("total_price") or 0)
    total_paid = float(booking.get("total_paid") or 0)
    balance = max(0.0, total_price - total_paid)
    _pdf_row(pdf, "Total Booking Amount (event + food, incl. GST)", total_price)
    _pdf_row(pdf, "Amount Paid", total_paid)
    _pdf_row(pdf, "Balance Due", balance, bold=True,
             color=(180, 30, 30) if balance > 0 else DARK)
    # close bottom border after last row
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(130, 0, "", border="B", ln=False)
    pdf.cell(0, 0, "", border="B", ln=True)

    # ── Changes summary ─────────────────────────────────────────────
    meaningful = [c.strip() for c in changes_summary.split(";") if c.strip() and c.strip() != "No field changes detected"]
    if meaningful:
        pdf.ln(5)
        _pdf_section_header(pdf, "CHANGES MADE IN THIS MODIFICATION", PURPLE)
        pdf.set_font("Helvetica", "", 9)
        for ch in meaningful:
            pdf.cell(5, 6, "-", ln=False)
            pdf.cell(0, 6, _pdf_safe(ch), ln=True)

    # ── Footer ──────────────────────────────────────────────────────
    pdf.ln(8)
    pdf.set_text_color(*GREY)
    pdf.set_font("Helvetica", "I", 8)
    pdf.cell(0, 5, "Computer-generated document. Contact DspireZone for queries.", align="C", ln=True)

    return bytes(pdf.output())


def _generate_food_invoice_pdf(booking: dict[str, Any], venue: dict[str, Any], changes_summary: str = "") -> bytes | None:
    """Generate a food invoice PDF. Returns None if fpdf2 is unavailable or no food was ordered."""
    if not _FPDF_AVAILABLE:
        return None
    food_pretax = float(booking.get("food_amount_pretax") or 0)
    if food_pretax <= 0:
        return None

    PURPLE = (124, 58, 237)
    DARK = (33, 33, 33)
    GREY = (100, 100, 100)

    inv_seq = str(booking.get("id", 0)).zfill(5)
    inv_ref = f"DZ/F/{inv_seq}"
    code = str(booking.get("confirmation_code", ""))
    food_cgst = round(food_pretax * 0.025, 2)
    food_sgst = round(food_pretax * 0.025, 2)
    food_total = round(food_pretax + food_cgst + food_sgst, 2)

    pdf = _FPDF()
    pdf.set_margins(15, 20, 15)
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=20)

    pdf.set_font("Helvetica", "B", 20)
    pdf.set_text_color(*PURPLE)
    pdf.cell(0, 10, "DspireZone", ln=True)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*GREY)
    pdf.cell(0, 5, _pdf_safe(str(venue.get("address") or "Event Venue")), ln=True)
    pdf.ln(4)

    pdf.set_fill_color(*PURPLE)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 10, "FOOD & BEVERAGES INVOICE  |  BOOKING MODIFICATION CONFIRMATION", fill=True, ln=True, align="C")
    pdf.ln(5)

    pdf.set_text_color(*DARK)
    for label, val in [
        ("Invoice Ref", inv_ref),
        ("Confirmation Code", code),
        ("Event Date", _format_date(booking.get("date"))),
        ("Venue", str(venue.get("name") or "DspireZone")),
    ]:
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(50, 7, f"{label}:", ln=False)
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(0, 7, _pdf_safe(str(val)), ln=True)
    pdf.ln(4)
    pdf.set_draw_color(*PURPLE)
    pdf.line(15, pdf.get_y(), 195, pdf.get_y())
    pdf.ln(4)

    _pdf_section_header(pdf, "BILLED TO", PURPLE)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 6, _pdf_safe(str(booking.get("contact_name") or "Guest")), ln=True)
    pdf.set_font("Helvetica", "", 10)
    if booking.get("contact_email"):
        pdf.cell(0, 5, _pdf_safe(str(booking["contact_email"])), ln=True)
    pdf.ln(5)

    # Line items
    pdf.set_fill_color(240, 234, 255)
    pdf.set_text_color(*DARK)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(130, 8, "Description", fill=True, border=1, ln=False)
    pdf.cell(0, 8, "Amount", fill=True, border=1, align="C", ln=True)

    pdf.set_font("Helvetica", "", 10)
    pdf.cell(130, 7, "Food & Beverages Selection", border="LR", ln=False)
    pdf.cell(0, 7, _format_currency(food_pretax), border="LR", align="R", ln=True)
    pdf.cell(130, 7, "CGST @ 2.5% (Tamil Nadu) - Food", border="LR", ln=False)
    pdf.cell(0, 7, _format_currency(food_cgst), border="LR", align="R", ln=True)
    pdf.cell(130, 7, "SGST @ 2.5% (Tamil Nadu) - Food", border="LR", ln=False)
    pdf.cell(0, 7, _format_currency(food_sgst), border="LR", align="R", ln=True)

    pdf.set_fill_color(240, 234, 255)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(130, 9, "FOOD INVOICE TOTAL", fill=True, border=1, ln=False)
    pdf.cell(0, 9, _format_currency(food_total), fill=True, border=1, align="R", ln=True)

    pdf.ln(10)
    pdf.set_text_color(*GREY)
    pdf.set_font("Helvetica", "I", 8)
    pdf.cell(0, 5, "Computer-generated document. Contact DspireZone for queries.", align="C", ln=True)

    return bytes(pdf.output())


# ---------------------------------------------------------------------------
# Booking modification email
# ---------------------------------------------------------------------------

def _build_modification_text_body(
    booking: dict[str, Any], venue: dict[str, Any], changes_summary: str, modify_link: str
) -> str:
    breakdown = booking.get("price_breakdown") or {}
    total_price = booking.get("total_price", 0)
    total_paid = booking.get("total_paid", 0)
    balance = max(0.0, float(total_price) - float(total_paid))
    code = booking.get("confirmation_code", "")

    lines = [
        "Your DspireZone booking has been updated. Please find the revised order summary below.",
        "",
        f"Confirmation Code : {code}",
        f"Venue             : {venue.get('name', 'DspireZone')}",
        f"Event Date        : {_format_date(booking.get('date'))}",
        f"Time              : {_format_time(booking.get('start_time'))} to {_format_time(booking.get('end_time'))}",
        f"Customer Name     : {booking.get('contact_name') or 'Guest'}",
        f"Customer Email    : {booking.get('contact_email') or 'N/A'}",
        f"Customer Phone    : {booking.get('contact_phone') or 'N/A'}",
        "",
        "CHANGES MADE:",
        *[f"  - {c.strip()}" for c in changes_summary.split(";") if c.strip() and c.strip() != "No field changes detected"],
        "",
        "ORDER SUMMARY:",
        f"  Event Space          : {_format_currency(breakdown.get('venue_subtotal', 0))}",
    ]
    if (breakdown.get("extra_rooms_subtotal") or 0) > 0:
        lines.append(f"  Extra Rooms          : {_format_currency(breakdown.get('extra_rooms_subtotal', 0))}")
    if (breakdown.get("foodcourt_subtotal") or 0) > 0:
        lines.append(f"  Food Court Tables    : {_format_currency(breakdown.get('foodcourt_subtotal', 0))}")
    if (breakdown.get("addons_subtotal") or 0) > 0:
        lines.append(f"  Add-ons              : {_format_currency(breakdown.get('addons_subtotal', 0))}")
    if (breakdown.get("favors_subtotal") or 0) > 0:
        lines.append(f"  Favors               : {_format_currency(breakdown.get('favors_subtotal', 0))}")
    if (booking.get("discount_pct") or 0) > 0 and booking.get("discount_code"):
        saving = round(float(breakdown.get("venue_subtotal", 0)) * float(booking.get("discount_pct", 0)) / 100, 2)
        lines.append(f"  Discount ({booking['discount_code']}) : -{_format_currency(saving)}")
    if (booking.get("food_amount_pretax") or 0) > 0:
        food_pre = float(booking["food_amount_pretax"])
        lines.append(f"  Food Order (5% GST)  : {_format_currency(round(food_pre * 1.05, 2))}")
    lines += [
        f"  TOTAL                : {_format_currency(total_price)}",
        "",
        "PAYMENT STATUS:",
        f"  Amount Paid          : {_format_currency(total_paid)}",
        f"  Balance Due          : {_format_currency(balance)}",
    ]
    event_url = booking.get("razorpay_invoice_short_url") or ""
    food_url = booking.get("razorpay_food_invoice_short_url") or ""
    if event_url:
        lines += ["", "VIEW / PAY EVENT INVOICE:", event_url]
    if food_url:
        lines += ["", "VIEW / PAY FOOD INVOICE:", food_url]
    lines += [
        "",
        "View or update your booking:",
        modify_link,
        "",
        "DspireZone",
    ]
    return "\n".join(lines)


def _build_modification_html_body(
    booking: dict[str, Any], venue: dict[str, Any], changes_summary: str, modify_link: str
) -> str:
    breakdown = booking.get("price_breakdown") or {}
    total_price = float(booking.get("total_price") or 0)
    total_paid = float(booking.get("total_paid") or 0)
    balance = max(0.0, total_price - total_paid)
    code = str(booking.get("confirmation_code") or "")

    # Build changes rows
    change_items = [c.strip() for c in changes_summary.split(";") if c.strip() and c.strip() != "No field changes detected"]
    changes_html = "".join(f"<li style='margin:4px 0'>{escape(c)}</li>" for c in change_items)

    # Build order rows
    order_rows = [("Event Space", float(breakdown.get("venue_subtotal") or 0))]
    if float(breakdown.get("extra_rooms_subtotal") or 0) > 0:
        order_rows.append(("Extra Rooms", float(breakdown["extra_rooms_subtotal"])))
    if float(breakdown.get("foodcourt_subtotal") or 0) > 0:
        order_rows.append(("Food Court Tables", float(breakdown["foodcourt_subtotal"])))
    if float(breakdown.get("addons_subtotal") or 0) > 0:
        order_rows.append(("Add-ons", float(breakdown["addons_subtotal"])))
    if float(breakdown.get("favors_subtotal") or 0) > 0:
        order_rows.append(("Favors", float(breakdown["favors_subtotal"])))

    discount_row_html = ""
    if float(booking.get("discount_pct") or 0) > 0 and booking.get("discount_code"):
        saving = round(float(breakdown.get("venue_subtotal", 0)) * float(booking["discount_pct"]) / 100, 2)
        discount_row_html = (
            f"<tr><td style='padding:5px 0;color:#0a8a0a'>Discount ({escape(booking['discount_code'])})</td>"
            f"<td style='text-align:right;color:#0a8a0a'>-{_format_currency(saving)}</td></tr>"
        )

    food_row_html = ""
    food_pre = float(booking.get("food_amount_pretax") or 0)
    if food_pre > 0:
        food_row_html = (
            f"<tr><td style='padding:5px 0'>Food Order (5% GST)</td>"
            f"<td style='text-align:right'>{_format_currency(round(food_pre * 1.05, 2))}</td></tr>"
        )

    order_rows_html = "".join(
        f"<tr><td style='padding:5px 0'>{escape(label)}</td><td style='text-align:right'>{_format_currency(amt)}</td></tr>"
        for label, amt in order_rows
    )

    razorpay_event_link = booking.get("razorpay_invoice_short_url") or ""
    razorpay_food_link = booking.get("razorpay_food_invoice_short_url") or ""
    invoice_links_html = ""
    if razorpay_event_link or razorpay_food_link:
        links = []
        if razorpay_event_link:
            links.append(
                f'<a href="{escape(razorpay_event_link)}" style="display:inline-block;margin:4px 8px 4px 0;'
                f'padding:8px 16px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">'
                f'View Event Invoice</a>'
            )
        if razorpay_food_link:
            links.append(
                f'<a href="{escape(razorpay_food_link)}" style="display:inline-block;margin:4px 8px 4px 0;'
                f'padding:8px 16px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">'
                f'View Food Invoice</a>'
            )
        invoice_links_html = (
            f'<div style="margin:20px 0 8px">'
            f'<p style="margin:0 0 8px;font-weight:bold;color:#7c3aed">Razorpay Invoice Links</p>'
            f'{"".join(links)}'
            f'</div>'
        )

    balance_color = "#b41e1e" if balance > 0 else "#0a8a0a"

    return f"""
<html>
<body style="font-family:Arial,sans-serif;color:#222;line-height:1.5;max-width:680px;margin:0 auto;">

  <div style="background:#7c3aed;padding:16px 24px;border-radius:8px 8px 0 0;">
    <h1 style="margin:0;color:#fff;font-size:22px;">DspireZone</h1>
    <p style="margin:4px 0 0;color:#ddd;font-size:13px;">{escape(str(venue.get('address') or ''))}</p>
  </div>

  <div style="border:1px solid #e0d0ff;border-top:none;padding:24px;border-radius:0 0 8px 8px;">

    <div style="background:#fff8e1;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:4px;margin-bottom:20px;">
      <p style="margin:0;font-weight:bold;font-size:15px;">Your booking has been updated</p>
      <p style="margin:4px 0 0;color:#555;font-size:13px;">Confirmation: <strong>{escape(code)}</strong></p>
    </div>

    <h3 style="margin:0 0 8px;color:#7c3aed;">Changes Made</h3>
    <ul style="margin:0 0 20px;padding-left:20px;color:#333;">
      {changes_html or "<li>Details updated</li>"}
    </ul>

    <h3 style="margin:0 0 10px;color:#7c3aed;">Booking Details</h3>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr><td style="padding:5px 0;width:45%;color:#666">Venue</td><td><strong>{escape(str(venue.get('name') or 'DspireZone'))}</strong></td></tr>
      <tr><td style="padding:5px 0;color:#666">Event Date</td><td><strong>{escape(_format_date(booking.get('date')))}</strong></td></tr>
      <tr><td style="padding:5px 0;color:#666">Time</td><td><strong>{escape(_format_time(booking.get('start_time')))} to {escape(_format_time(booking.get('end_time')))}</strong></td></tr>
      <tr><td style="padding:5px 0;color:#666">Customer</td><td>{escape(str(booking.get('contact_name') or 'Guest'))}</td></tr>
      <tr><td style="padding:5px 0;color:#666">Email</td><td>{escape(str(booking.get('contact_email') or ''))}</td></tr>
      <tr><td style="padding:5px 0;color:#666">Phone</td><td>{escape(str(booking.get('contact_phone') or ''))}</td></tr>
    </table>

    <h3 style="margin:0 0 10px;color:#7c3aed;">Order Summary</h3>
    <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
      <thead>
        <tr style="background:#f3eeff;">
          <th align="left" style="padding:8px;border:1px solid #e0d0ff;">Item</th>
          <th align="right" style="padding:8px;border:1px solid #e0d0ff;">Amount</th>
        </tr>
      </thead>
      <tbody>
        {order_rows_html}
        {discount_row_html}
        {food_row_html}
        <tr style="font-weight:bold;background:#f3eeff;">
          <td style="padding:8px;border-top:2px solid #7c3aed;">Total</td>
          <td style="padding:8px;border-top:2px solid #7c3aed;text-align:right">{_format_currency(total_price)}</td>
        </tr>
      </tbody>
    </table>

    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr><td style="padding:5px 0;color:#666">Amount Paid</td><td style="text-align:right">{_format_currency(total_paid)}</td></tr>
      <tr><td style="padding:5px 0;font-weight:bold;color:{balance_color}">Balance Due</td>
          <td style="text-align:right;font-weight:bold;color:{balance_color}">{_format_currency(balance)}</td></tr>
    </table>

    {invoice_links_html}

    <div style="margin:24px 0 0;padding:16px;background:#f5f0ff;border-radius:8px;border-left:4px solid #7c3aed;">
      <p style="margin:0 0 10px;font-weight:bold;">View or Modify Your Booking</p>
      <a href="{escape(modify_link)}" style="display:inline-block;padding:10px 20px;background:#7c3aed;color:#fff;
         text-decoration:none;border-radius:6px;font-weight:bold;">Open Booking Portal</a>
      <p style="margin:10px 0 0;font-size:12px;color:#888;">Or copy: {escape(modify_link)}</p>
    </div>

    <p style="margin-top:24px;color:#555;font-size:13px;">
      We will contact you if we need any clarification.<br><strong>DspireZone</strong>
    </p>
  </div>
</body>
</html>"""


def send_booking_modification_email(
    booking: dict[str, Any],
    venue: dict[str, Any],
    changes_summary: str = "",
) -> None:
    """
    Send a booking modification notification email to the customer (and alt email if set).
    Attaches event and food invoice PDFs generated from the current booking data.
    Called as a background task after update_booking commits.
    """
    customer_email = booking.get("contact_email")
    alt_email = booking.get("alt_email")

    recipients: list[str] = []
    if customer_email:
        recipients.append(str(customer_email))
    if alt_email and alt_email != customer_email:
        recipients.append(str(alt_email))

    if not recipients:
        logger.info(
            "Modification email skipped: no recipients for booking %s",
            booking.get("confirmation_code"),
        )
        return

    modify_link = f"{settings.SITE_BASE_URL}/modify-booking/{booking.get('confirmation_code')}"
    code = booking.get("confirmation_code", "")
    subject = f"DspireZone booking updated \u2013 {code}"

    text_body = _build_modification_text_body(booking, venue, changes_summary, modify_link)
    html_body = _build_modification_html_body(booking, venue, changes_summary, modify_link)

    messages = [
        _build_message(recipient, subject, text_body, html_body)
        for recipient in recipients
    ]

    try:
        _send_messages(messages)
        logger.info(
            "Modification email sent for booking %s to %s recipient(s)",
            code, len(messages),
        )
    except Exception:
        logger.exception(
            "Failed to send modification email for booking %s", code
        )