"""add razorpay invoice columns to bookings

Revision ID: 008
Revises: 007
Create Date: 2026-04-16
"""
from alembic import op
import sqlalchemy as sa

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("bookings", sa.Column("razorpay_invoice_id", sa.String(100), nullable=True))
    op.add_column("bookings", sa.Column("razorpay_invoice_short_url", sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column("bookings", "razorpay_invoice_short_url")
    op.drop_column("bookings", "razorpay_invoice_id")
