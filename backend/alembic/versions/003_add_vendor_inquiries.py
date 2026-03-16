"""Add vendor inquiries table

Revision ID: 003_add_vendor_inquiries
Revises: 002_add_valet_parking
Create Date: 2026-03-16

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "003_add_vendor_inquiries"
down_revision: Union[str, None] = "002_add_valet_parking"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "vendor_inquiries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("contact_number", sa.String(length=40), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("business_type", sa.String(length=120), nullable=False),
        sa.Column("opted_options", sa.Text(), nullable=False),
        sa.Column("previous_experience", sa.Text(), nullable=True),
        sa.Column("healthy_concept", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_vendor_inquiries_id", "vendor_inquiries", ["id"])
    op.create_index("ix_vendor_inquiries_email", "vendor_inquiries", ["email"])


def downgrade() -> None:
    op.drop_index("ix_vendor_inquiries_email", table_name="vendor_inquiries")
    op.drop_index("ix_vendor_inquiries_id", table_name="vendor_inquiries")
    op.drop_table("vendor_inquiries")
