"""Add food_item type and food columns to catalog_items; seed default food menu

Revision ID: 013
Revises: 012
Create Date: 2026-06-13
"""
from alembic import op
import sqlalchemy as sa

revision = "013"
down_revision = "012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Use batch mode to recreate catalog_items with the updated ItemType enum
    # (adds 'food_item') and new food-specific columns.  batch + recreate='always'
    # is required for SQLite because it cannot ALTER an existing CHECK constraint.
    with op.batch_alter_table("catalog_items", recreate="always") as batch_op:
        batch_op.alter_column(
            "type",
            existing_type=sa.Enum("service_addon", "favor_essential", name="itemtype"),
            type_=sa.Enum("service_addon", "favor_essential", "food_item", name="itemtype"),
            existing_nullable=False,
        )
        batch_op.add_column(sa.Column("emoji", sa.String(20), nullable=True))
        batch_op.add_column(
            sa.Column("shared", sa.Boolean(), nullable=False, server_default=sa.false())
        )
        batch_op.add_column(
            sa.Column("step", sa.Integer(), nullable=False, server_default=sa.text("1"))
        )
        batch_op.add_column(sa.Column("bg_color", sa.String(50), nullable=True))
        batch_op.add_column(sa.Column("price_label", sa.String(100), nullable=True))

    # ── Seed default food menu items ──────────────────────────────────────────
    # These match the previously hard-coded FOOD_MENU in BookingFlow.tsx so that
    # existing bookings (whose notes reference these labels) continue to parse
    # correctly after the migration.
    food_items = [
        # Personal / per-head items
        {
            "name": "Personal Pizza \u2013 Chicken",
            "description": "Personal size \u00b7 not shareable",
            "type": "food_item",
            "price_type": "fixed",
            "unit_label": "item",
            "price": 199.0,
            "active": True,
            "sort_order": 10,
            "emoji": "\U0001f355",
            "shared": False,
            "step": 1,
            "bg_color": "#fff3e0",
            "price_label": "\u20b9199 per item",
        },
        {
            "name": "Personal Pizza \u2013 Veg",
            "description": "Personal size \u00b7 not shareable",
            "type": "food_item",
            "price_type": "fixed",
            "unit_label": "item",
            "price": 179.0,
            "active": True,
            "sort_order": 20,
            "emoji": "\U0001f355",
            "shared": False,
            "step": 1,
            "bg_color": "#f1f8e9",
            "price_label": "\u20b9179 per item",
        },
        {
            "name": "Mutton Biryani \u2013 Kids",
            "description": "Kids portion \u00b7 per head",
            "type": "food_item",
            "price_type": "fixed",
            "unit_label": "head",
            "price": 249.0,
            "active": True,
            "sort_order": 30,
            "emoji": "\U0001f35a",
            "shared": False,
            "step": 1,
            "bg_color": "#fce4ec",
            "price_label": "\u20b9249 per head",
        },
        {
            "name": "Mutton Biryani \u2013 Adult",
            "description": "Full adult portion \u00b7 per head",
            "type": "food_item",
            "price_type": "fixed",
            "unit_label": "head",
            "price": 349.0,
            "active": True,
            "sort_order": 40,
            "emoji": "\U0001f35b",
            "shared": False,
            "step": 1,
            "bg_color": "#fce4ec",
            "price_label": "\u20b9349 per head",
        },
        {
            "name": "Chicken Biryani \u2013 Kids",
            "description": "Kids portion \u00b7 per head",
            "type": "food_item",
            "price_type": "fixed",
            "unit_label": "head",
            "price": 199.0,
            "active": True,
            "sort_order": 50,
            "emoji": "\U0001f35a",
            "shared": False,
            "step": 1,
            "bg_color": "#e8f5e9",
            "price_label": "\u20b9199 per head",
        },
        {
            "name": "Chicken Biryani \u2013 Adult",
            "description": "Full adult portion \u00b7 per head",
            "type": "food_item",
            "price_type": "fixed",
            "unit_label": "head",
            "price": 299.0,
            "active": True,
            "sort_order": 60,
            "emoji": "\U0001f35b",
            "shared": False,
            "step": 1,
            "bg_color": "#e8f5e9",
            "price_label": "\u20b9299 per head",
        },
        {
            "name": "Veg Package",
            "description": "Per head \u00b7 includes rice & sides",
            "type": "food_item",
            "price_type": "fixed",
            "unit_label": "head",
            "price": 149.0,
            "active": True,
            "sort_order": 70,
            "emoji": "\U0001f957",
            "shared": False,
            "step": 1,
            "bg_color": "#e8f5e9",
            "price_label": "\u20b9149 per head",
        },
        # Shareable items
        {
            "name": "Large Pizza",
            "description": "Serves 3 people \u00b7 shareable",
            "type": "food_item",
            "price_type": "fixed",
            "unit_label": "pizza",
            "price": 599.0,
            "active": True,
            "sort_order": 80,
            "emoji": "\U0001f355",
            "shared": True,
            "step": 1,
            "bg_color": "#fff3e0",
            "price_label": "\u20b9599 each (serves 3)",
        },
        {
            "name": "Fish Fingers",
            "description": "Shareable \u00b7 sold in packs of 10",
            "type": "food_item",
            "price_type": "fixed",
            "unit_label": "pack",
            "price": 299.0,
            "active": True,
            "sort_order": 90,
            "emoji": "\U0001f41f",
            "shared": True,
            "step": 10,
            "bg_color": "#e3f2fd",
            "price_label": "\u20b9299 per 10 pcs",
        },
        {
            "name": "Chicken Nuggets",
            "description": "Shareable \u00b7 sold in packs of 10",
            "type": "food_item",
            "price_type": "fixed",
            "unit_label": "pack",
            "price": 249.0,
            "active": True,
            "sort_order": 100,
            "emoji": "\U0001f357",
            "shared": True,
            "step": 10,
            "bg_color": "#fff8e1",
            "price_label": "\u20b9249 per 10 pcs",
        },
    ]

    catalog_items_table = sa.table(
        "catalog_items",
        sa.column("name", sa.String),
        sa.column("description", sa.Text),
        sa.column("type", sa.String),
        sa.column("price_type", sa.String),
        sa.column("unit_label", sa.String),
        sa.column("price", sa.Float),
        sa.column("active", sa.Boolean),
        sa.column("sort_order", sa.Integer),
        sa.column("emoji", sa.String),
        sa.column("shared", sa.Boolean),
        sa.column("step", sa.Integer),
        sa.column("bg_color", sa.String),
        sa.column("price_label", sa.String),
    )

    op.bulk_insert(catalog_items_table, food_items)


def downgrade() -> None:
    # Remove seeded food items
    op.execute(
        "DELETE FROM catalog_items WHERE type = 'food_item'"
    )

    # Recreate table without food columns and with original enum constraint
    with op.batch_alter_table("catalog_items", recreate="always") as batch_op:
        batch_op.alter_column(
            "type",
            existing_type=sa.Enum("service_addon", "favor_essential", "food_item", name="itemtype"),
            type_=sa.Enum("service_addon", "favor_essential", name="itemtype"),
            existing_nullable=False,
        )
        batch_op.drop_column("price_label")
        batch_op.drop_column("bg_color")
        batch_op.drop_column("step")
        batch_op.drop_column("shared")
        batch_op.drop_column("emoji")
