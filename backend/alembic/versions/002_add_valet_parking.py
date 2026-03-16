"""Add valet parking addon item

Revision ID: 002_add_valet_parking
Revises: 001_initial
Create Date: 2026-03-16

"""
from typing import Sequence, Union

from alembic import op


revision: str = "002_add_valet_parking"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO catalog_items (name, description, type, price_type, unit_label, price, active, sort_order)
        SELECT
            'Valet Parking Service',
            'Up to 15 cars can be parked. Charged at Rs. 1500/hr for the full event duration.',
            'service_addon',
            'per_hour',
            'hour',
            1500.0,
            1,
            8
        WHERE NOT EXISTS (
            SELECT 1 FROM catalog_items WHERE name = 'Valet Parking Service'
        )
        """
    )


def downgrade() -> None:
    op.execute("DELETE FROM catalog_items WHERE name = 'Valet Parking Service'")
