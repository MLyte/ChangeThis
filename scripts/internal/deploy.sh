#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-/opt/changethis}"
APP_USER="${APP_USER:-changethis}"
WEB_SERVICE="${WEB_SERVICE:-changethis-web}"
API_SERVICE="${API_SERVICE:-changethis-api}"
APP_URL="${APP_URL:-https://changethis.cra.wallonie.be}"
SMOKE_TIMEOUT_SECONDS="${SMOKE_TIMEOUT_SECONDS:-10}"
SMOKE_RETRY_SECONDS="${SMOKE_RETRY_SECONDS:-30}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

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

sudo -u "${APP_USER}" bash -lc "cd '${APP_ROOT}/repo' && git pull --ff-only && npm ci && npm run build"
sudo -u "${APP_USER}" bash -lc "set -a && . /etc/changethis/api.env && set +a && cd '${APP_ROOT}/repo/apps/api' && . .venv/bin/activate && pip install -e . && alembic upgrade head"

systemctl restart "${API_SERVICE}"
systemctl restart "${WEB_SERVICE}"

systemctl --no-pager --full status "${API_SERVICE}" "${WEB_SERVICE}" || true
wait_for_url "${APP_URL}/api/health"
wait_for_url "${APP_URL}/api/ready"

echo "Deploy complete."
