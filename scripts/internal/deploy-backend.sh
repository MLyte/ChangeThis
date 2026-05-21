#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-/opt/changethis}"
APP_USER="${APP_USER:-changethis}"
API_SERVICE="${API_SERVICE:-changethis-api}"
API_URL="${API_URL:-http://back.toolprod:8000}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

REPO_DIR="${APP_ROOT}/repo"
API_DIR="${REPO_DIR}/apps/api"

if [[ ! -d "${REPO_DIR}/.git" ]]; then
  echo "Missing repo at ${REPO_DIR}. Run scripts/internal/install-backend.sh first." >&2
  exit 1
fi

if [[ ! -x "${API_DIR}/.venv/bin/python" ]]; then
  echo "Missing API virtualenv at ${API_DIR}/.venv. Run scripts/internal/install-backend.sh first." >&2
  exit 1
fi

sudo -u "${APP_USER}" bash -lc "cd '${REPO_DIR}' && git pull --ff-only"
sudo -u "${APP_USER}" bash -lc "set -a && . /etc/changethis/api.env && set +a && cd '${API_DIR}' && . .venv/bin/activate && pip install -e . && alembic upgrade head"

systemctl restart "${API_SERVICE}"
systemctl is-active --quiet "${API_SERVICE}"

curl -fsS "${API_URL}/health" >/dev/null
curl -fsS "${API_URL}/ready" >/dev/null

echo "Backend deploy complete."
