"""Add admin_notes table for per-booking admin notes

Revision ID: 012
Revises: 011
Create Date: 2026-05-07
"""
from alembic import op
import sqlalchemy as sa

revision = "012"
down_revision = "011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "admin_notes",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("booking_id", sa.Integer(), sa.ForeignKey("bookings.id"), nullable=False, index=True),
        sa.Column("note_text", sa.Text(), nullable=False),
        sa.Column("created_by_name", sa.String(200), nullable=False, server_default="Admin"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("admin_notes")
