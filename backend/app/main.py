import os
import logging
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from .bootstrap import ensure_baseline_data
from .database import engine, Base, SQLALCHEMY_DATABASE_URL
from .routers import auth, venue, catalog, availability, bookings, admin, vendors, contact, payments

logger = logging.getLogger(__name__)


def _run_migrations() -> None:
    """Run Alembic migrations to head. Safe to call on every startup."""
    try:
        from alembic.config import Config
        from alembic import command as alembic_command

        # alembic.ini lives one directory above this package (i.e. backend/)
        ini_path = Path(__file__).parent.parent / "alembic.ini"
        if not ini_path.exists():
            logger.warning("alembic.ini not found at %s – skipping migrations", ini_path)
            return

        cfg = Config(str(ini_path))
        cfg.set_main_option("script_location", str(Path(__file__).parent.parent / "alembic"))
        # Use the same normalized URL the engine uses (handles Azure /home/data path)
        cfg.set_main_option("sqlalchemy.url", SQLALCHEMY_DATABASE_URL)
        alembic_command.upgrade(cfg, "head")
        logger.info("Alembic migrations applied to: %s", SQLALCHEMY_DATABASE_URL)
    except Exception as exc:
        logger.error("Alembic migration failed (app will still start): %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run pending DB migrations before anything else
    _run_migrations()
    # Create any tables not yet managed by Alembic (idempotent)
    Base.metadata.create_all(bind=engine)
    ensure_baseline_data()
    yield


app = FastAPI(
    title="DspireZone API",
    description="Booking API for DspireZone event venue",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS  – in prod restrict origins to your domain
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# API Routers (must come BEFORE the catch-all SPA handler)
# ---------------------------------------------------------------------------
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(venue.router, prefix="/api/venue", tags=["venue"])
app.include_router(catalog.router, prefix="/api/catalog", tags=["catalog"])
app.include_router(availability.router, prefix="/api/availability", tags=["availability"])
app.include_router(bookings.router, prefix="/api/bookings", tags=["bookings"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(vendors.router, prefix="/api/vendors", tags=["vendors"])
app.include_router(payments.router, prefix="/api/payments", tags=["payments"])
app.include_router(contact.router, prefix="/api/contact", tags=["contact"])


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/api/health", tags=["health"])
def health():
    return {"status": "ok", "service": "dspirezone-api"}


# ---------------------------------------------------------------------------
# Serve built React SPA (production)
# ---------------------------------------------------------------------------
_static_dir = Path(__file__).parent.parent / "static"

if _static_dir.exists():
    # Mount assets sub-directory so hashed filenames are served correctly
    _assets_dir = _static_dir / "assets"
    if _assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(_assets_dir)), name="spa-assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        # Serve exact file if it exists
        target = _static_dir / full_path
        if target.exists() and target.is_file():
            return FileResponse(str(target))
        # SPA fallback – hand everything else to React Router
        index = _static_dir / "index.html"
        if index.exists():
            return FileResponse(str(index))
        return JSONResponse({"detail": "Frontend not built"}, status_code=404)
else:
    @app.get("/", include_in_schema=False)
    async def root():
        return {"message": "DspireZone API is running. Build the frontend to serve the app."}
