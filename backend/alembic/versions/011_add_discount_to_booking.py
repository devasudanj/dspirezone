"""Add discount_code and discount_pct to bookings

Revision ID: 011
Revises: 010
Create Date: 2026-05-07
"""
from alembic import op
import sqlalchemy as sa

revision = "011"
down_revision = "010"
branch_labels = None
depends_on = None


def upgrade():
    # Use inspect to check existing columns before adding — SQLite doesn't support
    # IF NOT EXISTS for ALTER TABLE ADD COLUMN.
    from alembic import op as _op
    from sqlalchemy import inspect as _inspect
    bind = _op.get_bind()
    existing_cols = {c["name"] for c in _inspect(bind).get_columns("bookings")}

    with op.batch_alter_table("bookings", schema=None) as batch_op:
        if "discount_code" not in existing_cols:
            batch_op.add_column(sa.Column("discount_code", sa.String(50), nullable=True))
        if "discount_pct" not in existing_cols:
            batch_op.add_column(sa.Column("discount_pct", sa.Float(), nullable=True, server_default="0"))


def downgrade():
    with op.batch_alter_table("bookings", schema=None) as batch_op:
        batch_op.drop_column("discount_pct")
        batch_op.drop_column("discount_code")
