# DspireZone — Venue Booking Platform

A full-stack, production-ready venue booking web application for small events (birthdays, gatherings, celebrations). Built with **FastAPI** (backend) and **React + TypeScript + MUI** (frontend), deployed to **Azure App Service** via GitHub Actions.

---

## Features

- **Online booking flow** — 7-step wizard: date/time, included rooms, service add-ons, food court tables, extra rooms, party favors, and confirmation
- **Real-time pricing** — live price breakdown before confirming
- **User accounts** — JWT-based auth, booking history
- **Admin portal** — manage bookings, catalog items, venue settings, availability rules, and blackout dates
- **Food Court Table Booking** — reserve tables in the adjacent food court
- **Party Favors & Essentials** — browse and add decorative & utility items
- **1 Room Included** — one room is always included free with every booking

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | FastAPI 0.110, SQLAlchemy 2, Alembic, Pydantic v2, passlib/bcrypt, python-jose |
| Database | SQLite (development) · PostgreSQL (production) |
| Frontend | React 18, TypeScript, Vite 5, MUI v5, Framer Motion, dayjs |
| Auth | JWT access tokens (30-min expiry) |
| Deploy | Azure App Service (Python 3.11), GitHub Actions |

---

## Local Development

### Prerequisites

- Python 3.11+
- Node.js 20+
- (Optional) PostgreSQL for production-like local testing

### 1. Clone the repository

```bash
git clone https://github.com/<your-org>/dspirezone.git
cd dspirezone
```

### 2. Backend setup

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << 'EOF'
DATABASE_URL=sqlite:///./dspirezone.db
SECRET_KEY=change-me-to-a-long-random-string
ACCESS_TOKEN_EXPIRE_MINUTES=30
EOF

# Run database migrations
alembic upgrade head

# Seed initial data (venue, catalog items)
python seed.py

# Start development server
uvicorn app.main:app --reload --port 8000
```

Backend API is available at `http://localhost:8000`.  
Interactive docs: `http://localhost:8000/docs`

### 3. Frontend setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server (proxies /api → localhost:8000)
npm run dev
```

Frontend is available at `http://localhost:5173`.

---

## Running Tests

```bash
cd backend
pytest tests/ -v
```

Tests use an in-memory SQLite database and do not require a running server.

---

## Building for Production

```bash
# 1. Build the React SPA
cd frontend
npm run build                          # outputs to frontend/dist/

# 2. Copy build output into backend's static directory
cd ..
rm -rf backend/static
cp -r frontend/dist/. backend/static/

# 3. FastAPI will now serve the SPA from /static and the API from /api/*
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | SQLAlchemy connection string | `sqlite:///./dspirezone.db` |
| `SECRET_KEY` | JWT signing secret (≥32 chars) | **required** |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT lifetime in minutes | `30` |

For PostgreSQL, set `DATABASE_URL=postgresql://user:pass@host/dbname`.

---

## Azure Deployment

### One-time setup

1. **Create an Azure Web App** (Python 3.11, Linux):
   ```bash
   az webapp create \
     --resource-group dspirezone-rg \
     --plan dspirezone-plan \
     --name dspirezone \
     --runtime "PYTHON:3.11"
   ```

2. **Set environment variables** in Azure App Service → Configuration → Application settings:
   - `DATABASE_URL` — your PostgreSQL connection string
   - `SECRET_KEY` — a long random secret
   - `SCM_DO_BUILD_DURING_DEPLOYMENT` → `false`

3. **Set the startup command** in Azure App Service → Configuration → General settings:
   ```
   bash startup.sh
   ```
   (The `startup.sh` is generated automatically by the GitHub Actions workflow.)

4. **Add the publish profile secret** to your GitHub repository:
   - In Azure Portal → Web App → Deployment Center → Manage publish profile → Download
   - In GitHub → Repository Settings → Secrets → Actions → New: `AZURE_WEBAPP_PUBLISH_PROFILE`

### Continuous deployment

Push to `main` triggers the GitHub Actions workflow (`.github/workflows/deploy.yml`) which:
1. Builds the React frontend
2. Copies `frontend/dist/` → `backend/static/`
3. Runs `pytest` against SQLite
4. Deploys `backend/` to Azure App Service

---

## Project Structure

```
dspirezone/
├── backend/
│   ├── app/
│   │   ├── core/          # pricing & availability logic
│   │   ├── routers/       # FastAPI route handlers
│   │   ├── models.py      # SQLAlchemy ORM models
│   │   ├── schemas.py     # Pydantic request/response schemas
│   │   ├── deps.py        # Auth dependency injection
│   │   ├── database.py    # DB engine + session
│   │   └── main.py        # FastAPI app factory
│   ├── alembic/           # Database migrations
│   ├── tests/             # pytest tests
│   ├── seed.py            # Initial data seeder
│   ├── requirements.txt
│   └── startup.sh         # Azure startup script (generated by CI)
├── frontend/
│   ├── src/
│   │   ├── api/           # Axios client
│   │   ├── assets/        # SVG logo, gallery placeholders
│   │   ├── components/    # Navbar, Footer, ProtectedRoute, PriceBreakdown
│   │   ├── context/       # AuthContext (JWT + user state)
│   │   ├── pages/         # All page components
│   │   │   └── admin/     # Admin portal pages
│   │   ├── theme.ts       # MUI custom theme + BRAND colors
│   │   ├── types/         # TypeScript interfaces
│   │   ├── App.tsx        # Router configuration
│   │   └── main.tsx       # App entry point
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── .github/
│   └── workflows/
│       └── deploy.yml     # GitHub Actions CI/CD
└── README.md
```

---

## Admin Access

After seeding (`python seed.py`), an admin user is created:

| Email | Password |
|-------|----------|
| `admin@dspirezone.com` | `Admin@123` |

> **Change this password immediately in production.**

---

## License

Proprietary — DspireZone. All rights reserved.
