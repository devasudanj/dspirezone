from datetime import datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
from app.database import Base
from app.deps import get_db
from app.main import app
from app.models import NexGame, NexGameStatus, NexStation, NexStationStatus, User, UserRole


engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
SessionTesting = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = SessionTesting()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def setup_function():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def _seed_admin_and_data():
    db = SessionTesting()
    admin = User(
        name="Admin",
        email="admin@test.com",
        password_hash="test-hash",
        role=UserRole.admin,
    )
    regular_user = User(
        name="User",
        email="user@test.com",
        password_hash="test-hash",
        role=UserRole.user,
    )
    station = NexStation(code="NX-01", name="NEX Station 1", status=NexStationStatus.active, is_available=True)
    db.add_all([admin, regular_user, station])
    db.commit()
    db.refresh(admin)
    db.refresh(regular_user)
    db.refresh(station)

    game = NexGame(
        name="Fruit Ninja NEX",
        description="Arcade slicing",
        status=NexGameStatus.active,
        is_available=True,
        station_id=station.id,
    )
    db.add(game)
    db.commit()
    db.refresh(game)
    admin_id = admin.id
    user_id = regular_user.id
    game_id = game.id
    station_id = station.id
    db.close()
    return admin_id, user_id, game_id, station_id


def _auth_headers(user_id: int):
    token = create_access_token({"sub": str(user_id)})
    return {"Authorization": f"Bearer {token}"}


def test_fetch_nex_games():
    admin_id, _, _, _ = _seed_admin_and_data()
    res = client.get("/nex-games/", headers=_auth_headers(admin_id))
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 1
    assert len(data["items"]) == 1


def test_fetch_nex_game_not_found():
    admin_id, _, _, _ = _seed_admin_and_data()
    res = client.get("/nex-games/9999", headers=_auth_headers(admin_id))
    assert res.status_code == 404


def test_record_nex_game_visit():
    admin_id, _, game_id, _ = _seed_admin_and_data()
    res = client.post(
        f"/nex-games/{game_id}/visit",
        headers=_auth_headers(admin_id),
        json={"source": "ui", "metadata": {"device": "android"}},
    )
    assert res.status_code == 201
    assert res.json()["success"] is True


def test_fetch_nex_stations():
    admin_id, _, _, _ = _seed_admin_and_data()
    res = client.get("/nex-stations/", headers=_auth_headers(admin_id))
    assert res.status_code == 200
    assert len(res.json()) == 1


def test_create_and_fetch_nex_session():
    admin_id, _, game_id, station_id = _seed_admin_and_data()
    start_at = datetime.utcnow() + timedelta(days=1)
    end_at = start_at + timedelta(hours=1)

    create_res = client.post(
        "/nex-sessions/",
        headers=_auth_headers(admin_id),
        json={
            "game_id": game_id,
            "station_id": station_id,
            "participant_name": "Test Player",
            "participant_count": 2,
            "start_at": start_at.isoformat(),
            "end_at": end_at.isoformat(),
        },
    )
    assert create_res.status_code == 201
    session_id = create_res.json()["id"]

    get_res = client.get(f"/nex-sessions/{session_id}", headers=_auth_headers(admin_id))
    assert get_res.status_code == 200
    assert get_res.json()["id"] == session_id


def test_create_nex_session_overlap_conflict():
    admin_id, _, game_id, station_id = _seed_admin_and_data()
    start_at = datetime.utcnow() + timedelta(days=2)
    end_at = start_at + timedelta(hours=2)

    first = client.post(
        "/nex-sessions/",
        headers=_auth_headers(admin_id),
        json={
            "game_id": game_id,
            "station_id": station_id,
            "participant_name": "Player One",
            "participant_count": 1,
            "start_at": start_at.isoformat(),
            "end_at": end_at.isoformat(),
        },
    )
    assert first.status_code == 201

    conflict = client.post(
        "/nex-sessions/",
        headers=_auth_headers(admin_id),
        json={
            "game_id": game_id,
            "station_id": station_id,
            "participant_name": "Player Two",
            "participant_count": 1,
            "start_at": (start_at + timedelta(minutes=30)).isoformat(),
            "end_at": (end_at + timedelta(minutes=30)).isoformat(),
        },
    )
    assert conflict.status_code == 409


def test_nex_rbac_forbidden_for_non_admin():
    _, user_id, _, _ = _seed_admin_and_data()
    res = client.get("/nex-games/", headers=_auth_headers(user_id))
    assert res.status_code == 403
