"""Add thumbnail_url column to catalog_items

Revision ID: 014
Revises: 013
Create Date: 2026-06-13
"""
from alembic import op
import sqlalchemy as sa

revision = "014"
down_revision = "013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("catalog_items", recreate="auto") as batch_op:
        batch_op.add_column(sa.Column("thumbnail_url", sa.String(500), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("catalog_items", recreate="auto") as batch_op:
        batch_op.drop_column("thumbnail_url")
