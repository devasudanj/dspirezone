"""Add category and min_order_qty columns to catalog_items; seed categories for Biryani groups

Revision ID: 016
Revises: 015
Create Date: 2026-06-14
"""
from alembic import op
import sqlalchemy as sa

revision = "016"
down_revision = "015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add category and min_order_qty columns
    with op.batch_alter_table("catalog_items", recreate="auto") as batch_op:
        batch_op.add_column(sa.Column("category", sa.String(100), nullable=True))
        batch_op.add_column(
            sa.Column(
                "min_order_qty",
                sa.Integer(),
                nullable=False,
                server_default=sa.text("10"),
            )
        )

    # Seed category groupings and MOQ values for existing food items
    conn = op.get_bind()

    # Mutton Biryani category → MOQ 30
    conn.execute(
        sa.text(
            "UPDATE catalog_items SET category = 'Mutton Biryani', min_order_qty = 30 "
            "WHERE type = 'food_item' AND name LIKE 'Mutton Biryani%'"
        )
    )

    # Chicken Biryani category → MOQ 30
    conn.execute(
        sa.text(
            "UPDATE catalog_items SET category = 'Chicken Biryani', min_order_qty = 30 "
            "WHERE type = 'food_item' AND name LIKE 'Chicken Biryani%'"
        )
    )

    # All remaining food items: min_order_qty stays at 10 (default), category NULL (standalone)


def downgrade() -> None:
    with op.batch_alter_table("catalog_items", recreate="auto") as batch_op:
        batch_op.drop_column("min_order_qty")
        batch_op.drop_column("category")
