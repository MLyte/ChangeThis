#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-/opt/changethis}"
APP_USER="${APP_USER:-changethis}"
WEB_SERVICE="${WEB_SERVICE:-changethis-web}"
APP_URL="${APP_URL:-https://changethis.cra.wallonie.be}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

REPO_DIR="${APP_ROOT}/repo"

if [[ ! -d "${REPO_DIR}/.git" ]]; then
  echo "Missing repo at ${REPO_DIR}. Run scripts/internal/install-frontend.sh first." >&2
  exit 1
fi

sudo -u "${APP_USER}" bash -lc "cd '${REPO_DIR}' && git pull --ff-only && npm ci && npm run build"

systemctl restart "${WEB_SERVICE}"
systemctl is-active --quiet "${WEB_SERVICE}"

curl -fsS "${APP_URL}/api/health" >/dev/null
curl -fsS "${APP_URL}/api/ready" >/dev/null

echo "Frontend deploy complete."
