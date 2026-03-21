import logging

from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from pydantic import BaseModel, EmailStr

from ..core.config import settings
from ..core.email import _get_graph_token, _build_ssl_context

import json
import ssl
from urllib import request as urllib_request

logger = logging.getLogger(__name__)

router = APIRouter()


class ContactMessage(BaseModel):
    name: str
    email: EmailStr
    phone: str = ""
    message: str


def _send_contact_email(payload: ContactMessage) -> None:
    admin_email = settings.ORDER_CONFIRMATION_ADMIN_EMAIL
    if not admin_email:
        logger.warning("Contact form email skipped: ORDER_CONFIRMATION_ADMIN_EMAIL not set")
        return

    if not (settings.GRAPH_TENANT_ID and settings.GRAPH_CLIENT_ID and
            settings.GRAPH_CLIENT_SECRET and settings.GRAPH_SENDER_EMAIL):
        logger.warning("Contact form email skipped: Graph credentials not configured")
        return

    phone_line = f"\nPhone: {payload.phone}" if payload.phone else ""
    text_body = (
        f"New contact form message from {payload.name}\n"
        f"Email: {payload.email}{phone_line}\n\n"
        f"Message:\n{payload.message}"
    )
    html_body = f"""
<html>
  <body style="font-family: Arial, sans-serif; color: #222; line-height: 1.6;">
    <h2 style="color: #6c3fc4;">New Contact Form Message</h2>
    <table style="border-collapse: collapse; max-width: 600px; width: 100%;">
      <tr><td style="padding: 6px 0;"><strong>Name</strong></td><td style="padding: 6px 12px;">{payload.name}</td></tr>
      <tr><td style="padding: 6px 0;"><strong>Email</strong></td><td style="padding: 6px 12px;"><a href="mailto:{payload.email}">{payload.email}</a></td></tr>
      {"<tr><td style='padding: 6px 0;'><strong>Phone</strong></td><td style='padding: 6px 12px;'>" + payload.phone + "</td></tr>" if payload.phone else ""}
    </table>
    <h3 style="margin-top: 24px;">Message</h3>
    <p style="background: #f5f5f5; padding: 16px; border-radius: 6px; white-space: pre-wrap;">{payload.message}</p>
  </body>
</html>
"""

    sender = settings.GRAPH_SENDER_EMAIL
    token = _get_graph_token()
    url = f"https://graph.microsoft.com/v1.0/users/{sender}/sendMail"
    ssl_ctx = _build_ssl_context()

    body = json.dumps({
        "message": {
            "subject": f"DspireZone Contact Form – {payload.name}",
            "body": {"contentType": "HTML", "content": html_body},
            "toRecipients": [{"emailAddress": {"address": admin_email}}],
            "replyTo": [{"emailAddress": {"address": payload.email, "name": payload.name}}],
            "from": {"emailAddress": {"address": sender, "name": settings.SMTP_FROM_NAME}},
        },
        "saveToSentItems": False,
    }).encode()

    req = urllib_request.Request(
        url,
        data=body,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib_request.urlopen(req, context=ssl_ctx, timeout=15) as resp:
        if resp.status not in (200, 202):
            raise RuntimeError(f"Graph sendMail returned {resp.status}")

    logger.info("Contact form email sent to %s from %s", admin_email, payload.email)


@router.post("", status_code=status.HTTP_204_NO_CONTENT)
def submit_contact(payload: ContactMessage, background_tasks: BackgroundTasks):
    if not payload.name.strip() or not payload.message.strip():
        raise HTTPException(status_code=400, detail="Name and message are required")
    background_tasks.add_task(_send_contact_email, payload)
