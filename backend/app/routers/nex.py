import json
import logging
import time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..deps import get_admin_user
from ..models import (
    NexGame,
    NexGameStatus,
    NexGameVisit,
    NexSession,
    NexSessionStatus,
    NexStation,
    NexStationStatus,
    User,
)
from ..schemas import (
    NexGameListResponse,
    NexGameOut,
    NexGameVisitCreate,
    NexGameVisitResponse,
    NexSessionCreate,
    NexSessionOut,
    NexStationOut,
)

logger = logging.getLogger(__name__)
router = APIRouter()


def _emit_metrics(endpoint: str, started_at: float, success: bool) -> None:
    duration_ms = (time.perf_counter() - started_at) * 1000
    logger.info(
        "nex_request_metric",
        extra={
            "endpoint": endpoint,
            "success": success,
            "latency_ms": round(duration_ms, 2),
        },
    )


@router.get("/nex-games/", response_model=NexGameListResponse)
def fetch_nex_games(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[NexGameStatus] = Query(None, alias="status"),
    station_id: Optional[int] = Query(None, alias="stationId"),
    q: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    started_at = time.perf_counter()
    try:
        query = db.query(NexGame)
        if status_filter:
            query = query.filter(NexGame.status == status_filter)
        if station_id is not None:
            query = query.filter(NexGame.station_id == station_id)
        if q:
            like = f"%{q.strip()}%"
            query = query.filter(NexGame.name.ilike(like))

        total = query.count()
        items = (
            query.order_by(NexGame.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        _emit_metrics("fetchNexGames", started_at, True)
        return NexGameListResponse(items=items, total=total, page=page, page_size=page_size)
    except Exception:
        _emit_metrics("fetchNexGames", started_at, False)
        raise


@router.get("/nex-games/{game_id}", response_model=NexGameOut)
def fetch_nex_game(
    game_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    started_at = time.perf_counter()
    game = db.get(NexGame, game_id)
    if not game:
        _emit_metrics("fetchNexGame", started_at, False)
        raise HTTPException(status_code=404, detail="NEX game not found")
    _emit_metrics("fetchNexGame", started_at, True)
    return game


@router.post("/nex-games/{game_id}/visit", response_model=NexGameVisitResponse, status_code=status.HTTP_201_CREATED)
def record_nex_game_visit(
    game_id: int,
    payload: NexGameVisitCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_admin_user),
):
    started_at = time.perf_counter()
    game = db.get(NexGame, game_id)
    if not game:
        _emit_metrics("recordNexGameVisit", started_at, False)
        raise HTTPException(status_code=404, detail="NEX game not found")

    visit = NexGameVisit(
        game_id=game_id,
        user_id=user.id,
        session_id=payload.session_id,
        source=payload.source,
        metadata_json=json.dumps(payload.metadata) if payload.metadata is not None else None,
    )
    db.add(visit)
    db.commit()
    db.refresh(visit)

    logger.info(
        "nex_visit_recorded",
        extra={
            "game_id": game_id,
            "visit_id": visit.id,
            "user_id": user.id,
            "session_id": payload.session_id,
        },
    )
    _emit_metrics("recordNexGameVisit", started_at, True)
    return NexGameVisitResponse(success=True, visit_id=visit.id)


@router.get("/nex-stations/", response_model=list[NexStationOut])
def fetch_nex_stations(
    status_filter: Optional[NexStationStatus] = Query(None, alias="status"),
    available: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    started_at = time.perf_counter()
    query = db.query(NexStation)
    if status_filter:
        query = query.filter(NexStation.status == status_filter)
    if available is not None:
        query = query.filter(NexStation.is_available == available)

    stations = query.order_by(NexStation.id.asc()).all()
    _emit_metrics("fetchNexStations", started_at, True)
    return stations


@router.post("/nex-sessions/", response_model=NexSessionOut, status_code=status.HTTP_201_CREATED)
def create_nex_session(
    payload: NexSessionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_admin_user),
):
    started_at = time.perf_counter()

    game = db.get(NexGame, payload.game_id)
    if not game:
        _emit_metrics("createNexSession", started_at, False)
        raise HTTPException(status_code=404, detail="NEX game not found")

    station = db.get(NexStation, payload.station_id)
    if not station:
        _emit_metrics("createNexSession", started_at, False)
        raise HTTPException(status_code=404, detail="NEX station not found")

    overlap = (
        db.query(NexSession)
        .filter(NexSession.station_id == payload.station_id)
        .filter(NexSession.status != NexSessionStatus.cancelled)
        .filter(NexSession.start_at < payload.end_at)
        .filter(NexSession.end_at > payload.start_at)
        .first()
    )
    if overlap:
        _emit_metrics("createNexSession", started_at, False)
        raise HTTPException(status_code=409, detail="Session overlaps with an existing booking")

    new_session = NexSession(
        game_id=payload.game_id,
        station_id=payload.station_id,
        user_id=user.id,
        participant_name=payload.participant_name,
        participant_count=payload.participant_count,
        start_at=payload.start_at,
        end_at=payload.end_at,
        notes=payload.notes,
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    logger.info(
        "nex_session_created",
        extra={
            "session_id": new_session.id,
            "game_id": payload.game_id,
            "station_id": payload.station_id,
            "created_by": user.id,
        },
    )
    _emit_metrics("createNexSession", started_at, True)
    return (
        db.query(NexSession)
        .options(joinedload(NexSession.game), joinedload(NexSession.station))
        .filter(NexSession.id == new_session.id)
        .one()
    )


@router.get("/nex-sessions/{session_id}", response_model=NexSessionOut)
def fetch_nex_session(
    session_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    started_at = time.perf_counter()
    session = (
        db.query(NexSession)
        .options(joinedload(NexSession.game), joinedload(NexSession.station))
        .filter(NexSession.id == session_id)
        .first()
    )
    if not session:
        _emit_metrics("fetchNexSession", started_at, False)
        raise HTTPException(status_code=404, detail="NEX session not found")
    _emit_metrics("fetchNexSession", started_at, True)
    return session
