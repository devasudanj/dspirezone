"""Add alt_email and alt_phone to bookings

Revision ID: 006
Revises: 005
Create Date: 2026-03-23 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "006"
down_revision: Union[str, None] = "005_add_payments_and_audit_log"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("bookings", sa.Column("alt_email", sa.String(255), nullable=True))
    op.add_column("bookings", sa.Column("alt_phone", sa.String(40), nullable=True))


def downgrade() -> None:
    op.drop_column("bookings", "alt_phone")
    op.drop_column("bookings", "alt_email")
