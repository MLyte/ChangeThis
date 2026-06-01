#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-/opt/changethis}"
APP_USER="${APP_USER:-changethis}"
WEB_SERVICE="${WEB_SERVICE:-changethis-web}"
APP_URL="${APP_URL:-https://changethis.cra.wallonie.be}"
LOCAL_APP_URL="${LOCAL_APP_URL:-http://127.0.0.1:3000}"
SMOKE_TIMEOUT_SECONDS="${SMOKE_TIMEOUT_SECONDS:-10}"
PUBLIC_SMOKE="${PUBLIC_SMOKE:-0}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

REPO_DIR="${APP_ROOT}/repo"

if [[ ! -d "${REPO_DIR}/.git" ]]; then
  echo "Missing repo at ${REPO_DIR}. Run scripts/internal/install-frontend.sh first." >&2
  exit 1
fi

echo "Updating and building frontend..."
sudo -u "${APP_USER}" bash -lc "cd '${REPO_DIR}' && git pull --ff-only && npm ci && npm run build"

echo "Restarting ${WEB_SERVICE}..."
systemctl restart "${WEB_SERVICE}"
systemctl is-active --quiet "${WEB_SERVICE}"

echo "Checking local frontend health at ${LOCAL_APP_URL}..."
curl --max-time "${SMOKE_TIMEOUT_SECONDS}" -fsS "${LOCAL_APP_URL}/api/health" >/dev/null
curl --max-time "${SMOKE_TIMEOUT_SECONDS}" -fsS "${LOCAL_APP_URL}/api/ready" >/dev/null

if [[ "${PUBLIC_SMOKE}" == "1" ]]; then
  echo "Checking public frontend health at ${APP_URL}..."
  curl --max-time "${SMOKE_TIMEOUT_SECONDS}" -fsS "${APP_URL}/api/health" >/dev/null
  curl --max-time "${SMOKE_TIMEOUT_SECONDS}" -fsS "${APP_URL}/api/ready" >/dev/null
else
  echo "Skipping public smoke check. Set PUBLIC_SMOKE=1 to enable it."
fi

echo "Frontend deploy complete."
