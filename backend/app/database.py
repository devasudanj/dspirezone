import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from .core.config import settings


def _is_azure_app_service() -> bool:
    return bool(os.getenv("WEBSITE_SITE_NAME") or os.getenv("WEBSITE_INSTANCE_ID"))


def _normalize_sqlite_url(url: str) -> str:
    if not url.startswith("sqlite"):
        return url

    raw_path = url.removeprefix("sqlite:///")
    if raw_path in (":memory:", "") or raw_path.startswith("file:"):
        return url

    db_path = Path(raw_path)
    if _is_azure_app_service() and not db_path.is_absolute():
        # Relative SQLite paths can fail on App Service; use writable persistent storage.
        db_path = Path(os.getenv("SQLITE_DATA_DIR", "/home/data")) / db_path

    if db_path.is_absolute() or _is_azure_app_service():
        db_path.parent.mkdir(parents=True, exist_ok=True)
        return f"sqlite:///{db_path}"

    return url


SQLALCHEMY_DATABASE_URL = _normalize_sqlite_url(settings.DATABASE_URL)

connect_args = {}
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
