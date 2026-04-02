"""Add cal_booking_uid to bookings

Revision ID: 007
Revises: 006
Create Date: 2026-04-02
"""
from alembic import op
import sqlalchemy as sa

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "bookings",
        sa.Column("cal_booking_uid", sa.String(100), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("bookings", "cal_booking_uid")
