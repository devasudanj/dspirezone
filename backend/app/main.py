import os
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from .database import engine, Base
from .routers import auth, venue, catalog, availability, bookings, admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables (idempotent; Alembic handles prod migrations)
    Base.metadata.create_all(bind=engine)
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
