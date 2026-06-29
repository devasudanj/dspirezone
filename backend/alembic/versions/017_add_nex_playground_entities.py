"""Add NEX playground tables

Revision ID: 017
Revises: 016
Create Date: 2026-06-28
"""

from alembic import op
import sqlalchemy as sa


revision = "017"
down_revision = "016"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "nex_stations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("status", sa.Enum("active", "inactive", "maintenance", name="nexstationstatus"), nullable=False),
        sa.Column("is_available", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("capabilities", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index("ix_nex_stations_code", "nex_stations", ["code"], unique=False)
    op.create_index("ix_nex_stations_id", "nex_stations", ["id"], unique=False)
    op.create_index("ix_nex_stations_status", "nex_stations", ["status"], unique=False)

    op.create_table(
        "nex_games",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.Enum("active", "inactive", name="nexgamestatus"), nullable=False),
        sa.Column("is_available", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("station_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["station_id"], ["nex_stations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_nex_games_id", "nex_games", ["id"], unique=False)
    op.create_index("ix_nex_games_name", "nex_games", ["name"], unique=False)
    op.create_index("ix_nex_games_station_id", "nex_games", ["station_id"], unique=False)
    op.create_index("ix_nex_games_status", "nex_games", ["status"], unique=False)
    op.create_index("ix_nex_games_status_station", "nex_games", ["status", "station_id"], unique=False)

    op.create_table(
        "nex_sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("game_id", sa.Integer(), nullable=False),
        sa.Column("station_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("participant_name", sa.String(length=120), nullable=False),
        sa.Column("participant_count", sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.Column("start_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.Enum("scheduled", "completed", "cancelled", name="nexsessionstatus"), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["game_id"], ["nex_games.id"]),
        sa.ForeignKeyConstraint(["station_id"], ["nex_stations.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_nex_sessions_id", "nex_sessions", ["id"], unique=False)
    op.create_index("ix_nex_sessions_game_id", "nex_sessions", ["game_id"], unique=False)
    op.create_index("ix_nex_sessions_station_id", "nex_sessions", ["station_id"], unique=False)
    op.create_index("ix_nex_sessions_user_id", "nex_sessions", ["user_id"], unique=False)
    op.create_index("ix_nex_sessions_status", "nex_sessions", ["status"], unique=False)
    op.create_index("ix_nex_sessions_station_start_end", "nex_sessions", ["station_id", "start_at", "end_at"], unique=False)
    op.create_index("ix_nex_sessions_game_created", "nex_sessions", ["game_id", "created_at"], unique=False)

    op.create_table(
        "nex_game_visits",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("game_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("session_id", sa.String(length=120), nullable=True),
        sa.Column("source", sa.String(length=80), nullable=True),
        sa.Column("metadata", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["game_id"], ["nex_games.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_nex_game_visits_id", "nex_game_visits", ["id"], unique=False)
    op.create_index("ix_nex_game_visits_game_id", "nex_game_visits", ["game_id"], unique=False)
    op.create_index("ix_nex_game_visits_user_id", "nex_game_visits", ["user_id"], unique=False)
    op.create_index("ix_nex_game_visits_session_id", "nex_game_visits", ["session_id"], unique=False)
    op.create_index("ix_nex_game_visits_game_created", "nex_game_visits", ["game_id", "created_at"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    op.drop_index("ix_nex_game_visits_game_created", table_name="nex_game_visits")
    op.drop_index("ix_nex_game_visits_session_id", table_name="nex_game_visits")
    op.drop_index("ix_nex_game_visits_user_id", table_name="nex_game_visits")
    op.drop_index("ix_nex_game_visits_game_id", table_name="nex_game_visits")
    op.drop_index("ix_nex_game_visits_id", table_name="nex_game_visits")
    op.drop_table("nex_game_visits")

    op.drop_index("ix_nex_sessions_game_created", table_name="nex_sessions")
    op.drop_index("ix_nex_sessions_station_start_end", table_name="nex_sessions")
    op.drop_index("ix_nex_sessions_status", table_name="nex_sessions")
    op.drop_index("ix_nex_sessions_user_id", table_name="nex_sessions")
    op.drop_index("ix_nex_sessions_station_id", table_name="nex_sessions")
    op.drop_index("ix_nex_sessions_game_id", table_name="nex_sessions")
    op.drop_index("ix_nex_sessions_id", table_name="nex_sessions")
    op.drop_table("nex_sessions")

    op.drop_index("ix_nex_games_status_station", table_name="nex_games")
    op.drop_index("ix_nex_games_status", table_name="nex_games")
    op.drop_index("ix_nex_games_station_id", table_name="nex_games")
    op.drop_index("ix_nex_games_name", table_name="nex_games")
    op.drop_index("ix_nex_games_id", table_name="nex_games")
    op.drop_table("nex_games")

    op.drop_index("ix_nex_stations_status", table_name="nex_stations")
    op.drop_index("ix_nex_stations_id", table_name="nex_stations")
    op.drop_index("ix_nex_stations_code", table_name="nex_stations")
    op.drop_table("nex_stations")

    if is_postgres:
        op.execute("DROP TYPE IF EXISTS nexsessionstatus")
        op.execute("DROP TYPE IF EXISTS nexgamestatus")
        op.execute("DROP TYPE IF EXISTS nexstationstatus")
