#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-/opt/changethis}"
APP_USER="${APP_USER:-changethis}"
WEB_SERVICE="${WEB_SERVICE:-changethis-web}"
APP_URL="${APP_URL:-https://changethis.cra.wallonie.be}"
LOCAL_APP_URL="${LOCAL_APP_URL:-http://127.0.0.1:3000}"
SMOKE_TIMEOUT_SECONDS="${SMOKE_TIMEOUT_SECONDS:-10}"
SMOKE_RETRY_SECONDS="${SMOKE_RETRY_SECONDS:-30}"
PUBLIC_SMOKE="${PUBLIC_SMOKE:-0}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

REPO_DIR="${APP_ROOT}/repo"

wait_for_url() {
  local url="$1"
  local deadline=$((SECONDS + SMOKE_RETRY_SECONDS))

  until curl --max-time "${SMOKE_TIMEOUT_SECONDS}" -fsS "${url}" >/dev/null; do
    if (( SECONDS >= deadline )); then
      echo "Timed out waiting for ${url}" >&2
      return 1
    fi
    sleep 1
  done
}

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
wait_for_url "${LOCAL_APP_URL}/api/health"
wait_for_url "${LOCAL_APP_URL}/api/ready"

if [[ "${PUBLIC_SMOKE}" == "1" ]]; then
  echo "Checking public frontend health at ${APP_URL}..."
  wait_for_url "${APP_URL}/api/health"
  wait_for_url "${APP_URL}/api/ready"
else
  echo "Skipping public smoke check. Set PUBLIC_SMOKE=1 to enable it."
fi

echo "Frontend deploy complete."
