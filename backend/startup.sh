#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"
if [ -f requirements.txt ]; then
  pip install -r requirements.txt
fi
if [ -f alembic.ini ]; then
  alembic upgrade head || true
fi
if [ -f seed.py ]; then
  python seed.py || true
fi
exec gunicorn -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:8000 --workers 2 --timeout 180
