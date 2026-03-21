"""Add booking contact snapshot fields

Revision ID: 004_add_booking_contact_fields
Revises: 003_add_vendor_inquiries
Create Date: 2026-03-17

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "004_add_booking_contact_fields"
down_revision: Union[str, None] = "003_add_vendor_inquiries"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("bookings", sa.Column("contact_name", sa.String(length=100), nullable=True))
    op.add_column("bookings", sa.Column("contact_email", sa.String(length=255), nullable=True))
    op.add_column("bookings", sa.Column("contact_phone", sa.String(length=40), nullable=True))
    op.create_index("ix_bookings_contact_email", "bookings", ["contact_email"])

    op.execute(
        """
        UPDATE bookings
        SET
            contact_name = COALESCE(contact_name, (SELECT users.name FROM users WHERE users.id = bookings.user_id)),
            contact_email = COALESCE(contact_email, (SELECT users.email FROM users WHERE users.id = bookings.user_id)),
            contact_phone = COALESCE(
                contact_phone,
                CASE
                    WHEN notes LIKE 'Guest phone: %' THEN substr(notes, 14)
                    ELSE NULL
                END
            )
        """
    )


def downgrade() -> None:
    op.drop_index("ix_bookings_contact_email", table_name="bookings")
    op.drop_column("bookings", "contact_phone")
    op.drop_column("bookings", "contact_email")
    op.drop_column("bookings", "contact_name")
