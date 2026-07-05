#!/usr/bin/env bash
# Local dev launcher — loads .env, uses project-local DB/uploads (not Docker paths).
set -euo pipefail
cd "$(dirname "$0")"

if [[ ! -f ../.env ]]; then
  echo "Missing ../.env (JWT_SECRET_KEY and AI_API_KEY required)" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source ../.env
set +a

export DB_PATH="${DB_PATH:-$(pwd)/data/gymtrack.db}"
export UPLOAD_ROOT="${UPLOAD_ROOT:-$(pwd)/uploads}"
mkdir -p "$(dirname "$DB_PATH")" "$UPLOAD_ROOT/avatars"

exec .venv/bin/python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
