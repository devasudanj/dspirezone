"""Add discount_codes table and discount_code column to bookings

Revision ID: 009
Revises: 008
Create Date: 2026-04-20
"""
from alembic import op
import sqlalchemy as sa

revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "discount_codes",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("code", sa.String(50), unique=True, nullable=False, index=True),
        sa.Column("description", sa.String(255), nullable=True),
        sa.Column("discount_pct", sa.Float(), nullable=False),  # e.g. 10, 25, 50
        sa.Column("active", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("valid_from", sa.Date(), nullable=True),
        sa.Column("valid_until", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    # Track which discount was applied to a booking
    op.add_column(
        "bookings",
        sa.Column("discount_code", sa.String(50), nullable=True),
    )
    op.add_column(
        "bookings",
        sa.Column("discount_pct", sa.Float(), nullable=True),
    )

    # Seed initial discount codes
    op.execute("""
        INSERT INTO discount_codes (code, description, discount_pct, active, valid_from, valid_until)
        VALUES
          ('DZ-APR10',     'April 10% Off Event Space',        10.0, 1, '2026-04-01', '2026-04-30'),
          ('DZ-APR25',     'April 25% Off Event Space',        25.0, 1, '2026-04-01', '2026-04-30'),
          ('DZ-APR50',     'April 50% Off Event Space',        50.0, 1, '2026-04-01', '2026-04-30'),
          ('DZ-MAY10',     'May 10% Off Event Space',          10.0, 1, '2026-05-01', '2026-05-31'),
          ('DZ-MAY25',     'May 25% Off Event Space',          25.0, 1, '2026-05-01', '2026-05-31'),
          ('DZ-SPECIAL25', 'Off-Hours Special 25% Discount',   25.0, 1, '2026-01-01', '2026-12-31')
    """)


def downgrade() -> None:
    op.drop_column("bookings", "discount_pct")
    op.drop_column("bookings", "discount_code")
    op.drop_table("discount_codes")
