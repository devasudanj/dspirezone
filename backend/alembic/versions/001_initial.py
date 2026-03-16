"""Initial schema

Revision ID: 001_initial
Revises: 
Create Date: 2026-03-15

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("email", sa.String(255), nullable=False, unique=True, index=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), nullable=False, server_default="user"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "venues",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("address", sa.String(500)),
        sa.Column("base_hourly_rate", sa.Float(), nullable=False, server_default="1500.0"),
        sa.Column("min_hours", sa.Integer(), server_default="2"),
        sa.Column("buffer_minutes", sa.Integer(), server_default="30"),
        sa.Column("timezone", sa.String(50), server_default="Asia/Kolkata"),
        sa.Column("included_rooms_count", sa.Integer(), server_default="1"),
        sa.Column("extra_room_hourly_rate", sa.Float(), server_default="500.0"),
        sa.Column("foodcourt_table_rate_type", sa.String(30), server_default="fixed_per_event"),
        sa.Column("foodcourt_table_rate", sa.Float(), server_default="300.0"),
    )

    op.create_table(
        "catalog_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("type", sa.String(30), nullable=False),
        sa.Column("price_type", sa.String(20), nullable=False, server_default="fixed"),
        sa.Column("unit_label", sa.String(50), server_default="item"),
        sa.Column("price", sa.Float(), nullable=False),
        sa.Column("active", sa.Boolean(), server_default="1"),
        sa.Column("sort_order", sa.Integer(), server_default="0"),
    )

    op.create_table(
        "availability_rules",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("venue_id", sa.Integer(), sa.ForeignKey("venues.id"), nullable=False),
        sa.Column("day_of_week", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
    )

    op.create_table(
        "blackout_dates",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("venue_id", sa.Integer(), sa.ForeignKey("venues.id"), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("reason", sa.String(500)),
    )

    op.create_table(
        "bookings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("venue_id", sa.Integer(), sa.ForeignKey("venues.id"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("total_price", sa.Float(), nullable=False),
        sa.Column("confirmation_code", sa.String(20), nullable=False, unique=True),
        sa.Column("notes", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("rooms_included_count", sa.Integer(), server_default="1"),
        sa.Column("extra_rooms_count", sa.Integer(), server_default="0"),
        sa.Column("foodcourt_tables_count", sa.Integer(), server_default="0"),
        sa.Column("foodcourt_table_notes", sa.Text()),
    )

    op.create_table(
        "booking_line_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("booking_id", sa.Integer(), sa.ForeignKey("bookings.id"), nullable=False),
        sa.Column("catalog_item_id", sa.Integer(), sa.ForeignKey("catalog_items.id"), nullable=True),
        sa.Column("item_type", sa.String(50), nullable=False),
        sa.Column("item_name", sa.String(200)),
        sa.Column("quantity", sa.Float(), server_default="1.0"),
        sa.Column("unit_price", sa.Float(), nullable=False),
        sa.Column("price_type", sa.String(20)),
        sa.Column("unit_label", sa.String(50)),
        sa.Column("line_total", sa.Float(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("booking_line_items")
    op.drop_table("bookings")
    op.drop_table("blackout_dates")
    op.drop_table("availability_rules")
    op.drop_table("catalog_items")
    op.drop_table("venues")
    op.drop_table("users")
