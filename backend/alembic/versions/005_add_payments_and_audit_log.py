"""Add payments and booking_audit_logs tables

Revision ID: 005
Revises: 004
Create Date: 2025-01-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "005_add_payments_and_audit_log"
down_revision: Union[str, None] = "004_add_booking_contact_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "payments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("booking_id", sa.Integer(), sa.ForeignKey("bookings.id"), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("pending", "completed", "failed", "refunded", name="paymentstatus"),
            nullable=False,
            server_default="completed",
        ),
        sa.Column("payment_ref", sa.String(255), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_payments_id", "payments", ["id"])
    op.create_index("ix_payments_booking_id", "payments", ["booking_id"])

    op.create_table(
        "booking_audit_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("booking_id", sa.Integer(), sa.ForeignKey("bookings.id"), nullable=False),
        sa.Column("previous_snapshot", sa.Text(), nullable=False),
        sa.Column("changed_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("changed_by_name", sa.String(200), nullable=True),
        sa.Column("changed_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("change_summary", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_booking_audit_logs_id", "booking_audit_logs", ["id"])
    op.create_index("ix_booking_audit_logs_booking_id", "booking_audit_logs", ["booking_id"])


def downgrade() -> None:
    op.drop_index("ix_booking_audit_logs_booking_id", table_name="booking_audit_logs")
    op.drop_index("ix_booking_audit_logs_id", table_name="booking_audit_logs")
    op.drop_table("booking_audit_logs")

    op.drop_index("ix_payments_booking_id", table_name="payments")
    op.drop_index("ix_payments_id", table_name="payments")
    op.drop_table("payments")
    op.execute("DROP TYPE IF EXISTS paymentstatus")
