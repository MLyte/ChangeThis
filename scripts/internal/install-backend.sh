#!/usr/bin/env bash
set -euo pipefail

APP_USER="${APP_USER:-changethis}"
APP_ROOT="${APP_ROOT:-/opt/changethis}"
REPO_URL="${REPO_URL:-git@gitrural:ChangeThis.git}"
API_HOST="${API_HOST:-127.0.0.1}"
API_PORT="${API_PORT:-8000}"
DATABASE_URL="${DATABASE_URL:-postgresql+asyncpg://changethis:change-me@back.toolprod:5432/changethis}"
ALLOWED_PUBLIC_ORIGINS="${ALLOWED_PUBLIC_ORIGINS:-https://changethis.cra.wallonie.be}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

id "${APP_USER}" >/dev/null 2>&1 || useradd --system --create-home --shell /bin/bash "${APP_USER}"
install -d -o "${APP_USER}" -g "${APP_USER}" "${APP_ROOT}" /etc/changethis

apt-get update
apt-get install -y ca-certificates git openssh-client python3.12 python3.12-venv

if [[ ! -d "${APP_ROOT}/repo/.git" ]]; then
  sudo -u "${APP_USER}" git clone "${REPO_URL}" "${APP_ROOT}/repo"
fi

cat >/etc/changethis/api.env <<ENV
DATABASE_URL=${DATABASE_URL}
SESSION_SECRET=change-me-generate-a-32-byte-minimum-secret
CHANGETHIS_SECRET_KEY=change-me-generate-a-32-byte-minimum-secret
ALLOWED_PUBLIC_ORIGINS=${ALLOWED_PUBLIC_ORIGINS}
ENV
chmod 0640 /etc/changethis/api.env
chown root:"${APP_USER}" /etc/changethis/api.env

sudo -u "${APP_USER}" bash -lc "cd '${APP_ROOT}/repo/apps/api' && python3.12 -m venv .venv && . .venv/bin/activate && pip install -U pip && pip install -e ."

cat >/etc/systemd/system/changethis-api.service <<SERVICE
[Unit]
Description=ChangeThis FastAPI backend
After=network.target postgresql.service

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_ROOT}/repo/apps/api
EnvironmentFile=/etc/changethis/api.env
ExecStart=${APP_ROOT}/repo/apps/api/.venv/bin/uvicorn app.main:app --host ${API_HOST} --port ${API_PORT} --timeout-graceful-shutdown 10
Restart=always
RestartSec=5
TimeoutStopSec=20

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable --now changethis-api

echo "Backend installed. Run Alembic after DB setup: set -a && . /etc/changethis/api.env && set +a && cd ${APP_ROOT}/repo/apps/api && . .venv/bin/activate && alembic upgrade head"
