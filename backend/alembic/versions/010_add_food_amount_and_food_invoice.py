"""Add food_amount_pretax and food invoice fields to bookings

Revision ID: 010
Revises: 009
Create Date: 2025-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '010'
down_revision = '009'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('bookings', schema=None) as batch_op:
        batch_op.add_column(sa.Column('food_amount_pretax', sa.Float(), nullable=True, server_default='0'))
        batch_op.add_column(sa.Column('razorpay_food_invoice_id', sa.String(100), nullable=True))
        batch_op.add_column(sa.Column('razorpay_food_invoice_short_url', sa.String(500), nullable=True))


def downgrade():
    with op.batch_alter_table('bookings', schema=None) as batch_op:
        batch_op.drop_column('food_amount_pretax')
        batch_op.drop_column('razorpay_food_invoice_id')
        batch_op.drop_column('razorpay_food_invoice_short_url')
