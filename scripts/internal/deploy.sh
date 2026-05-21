#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-/opt/changethis}"
APP_USER="${APP_USER:-changethis}"
WEB_SERVICE="${WEB_SERVICE:-changethis-web}"
API_SERVICE="${API_SERVICE:-changethis-api}"
APP_URL="${APP_URL:-https://changethis.toolprod}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

sudo -u "${APP_USER}" bash -lc "cd '${APP_ROOT}/repo' && git pull --ff-only && npm ci && npm run build"
sudo -u "${APP_USER}" bash -lc "cd '${APP_ROOT}/repo/apps/api' && . .venv/bin/activate && pip install -e . && alembic upgrade head"

systemctl restart "${API_SERVICE}"
systemctl restart "${WEB_SERVICE}"

systemctl --no-pager --full status "${API_SERVICE}" "${WEB_SERVICE}" || true
curl -fsS "${APP_URL}/api/health" >/dev/null
curl -fsS "${APP_URL}/api/ready" >/dev/null

echo "Deploy complete."
