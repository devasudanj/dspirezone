#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Use venv if available locally, otherwise fall back to system pip
if [ -f "$SCRIPT_DIR/.venv311/bin/pip" ]; then
  PIP="$SCRIPT_DIR/.venv311/bin/pip"
  ALEMBIC="$SCRIPT_DIR/.venv311/bin/alembic"
  GUNICORN="$SCRIPT_DIR/.venv311/bin/gunicorn"
  PYTHON="$SCRIPT_DIR/.venv311/bin/python"
elif [ -f "$SCRIPT_DIR/.venv/bin/pip" ]; then
  PIP="$SCRIPT_DIR/.venv/bin/pip"
  ALEMBIC="$SCRIPT_DIR/.venv/bin/alembic"
  GUNICORN="$SCRIPT_DIR/.venv/bin/gunicorn"
  PYTHON="$SCRIPT_DIR/.venv/bin/python"
else
  PIP="pip"
  ALEMBIC="alembic"
  GUNICORN="gunicorn"
  PYTHON="python"
fi

if [ -f requirements.txt ]; then
  $PIP install -r requirements.txt
fi
if [ -f alembic.ini ]; then
  $ALEMBIC upgrade head || true
fi
if [ -f seed.py ]; then
  $PYTHON seed.py || true
fi
exec $GUNICORN -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:8000 --workers 2 --timeout 180
