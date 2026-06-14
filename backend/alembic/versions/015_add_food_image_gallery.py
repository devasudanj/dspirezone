"""Add image_url_2 and image_url_3 columns to catalog_items (3-image gallery for food)

Revision ID: 015
Revises: 014
Create Date: 2026-06-13
"""
from alembic import op
import sqlalchemy as sa

revision = "015"
down_revision = "014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("catalog_items", recreate="auto") as batch_op:
        batch_op.add_column(sa.Column("image_url_2", sa.String(500), nullable=True))
        batch_op.add_column(sa.Column("image_url_3", sa.String(500), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("catalog_items", recreate="auto") as batch_op:
        batch_op.drop_column("image_url_3")
        batch_op.drop_column("image_url_2")
