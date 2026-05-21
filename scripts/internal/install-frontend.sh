#!/usr/bin/env bash
set -euo pipefail

APP_USER="${APP_USER:-changethis}"
APP_ROOT="${APP_ROOT:-/opt/changethis}"
REPO_URL="${REPO_URL:-git@gitrural:ChangeThis.git}"
APP_DOMAIN="${APP_DOMAIN:-changethis.toolprod}"
WEB_HOST="${WEB_HOST:-127.0.0.1}"
WEB_PORT="${WEB_PORT:-3000}"
INTERNAL_API_URL="${INTERNAL_API_URL:-http://back.toolprod:8000}"
NODE_MAJOR="${NODE_MAJOR:-22}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

id "${APP_USER}" >/dev/null 2>&1 || useradd --system --create-home --shell /bin/bash "${APP_USER}"
install -d -o "${APP_USER}" -g "${APP_USER}" "${APP_ROOT}" /etc/changethis

apt-get update
apt-get install -y ca-certificates curl git openssh-client nginx

if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -d. -f1 | tr -d v)" != "${NODE_MAJOR}" ]]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi

if [[ ! -d "${APP_ROOT}/repo/.git" ]]; then
  sudo -u "${APP_USER}" git clone "${REPO_URL}" "${APP_ROOT}/repo"
fi

cat >/etc/changethis/web.env <<ENV
NODE_ENV=production
AUTH_MODE=internal
DATA_STORE=internal
NEXT_PUBLIC_APP_URL=https://${APP_DOMAIN}
INTERNAL_API_URL=${INTERNAL_API_URL}
CHANGETHIS_SECRET_KEY=change-me-generate-a-32-byte-minimum-secret
ENV
chmod 0640 /etc/changethis/web.env
chown root:"${APP_USER}" /etc/changethis/web.env

sudo -u "${APP_USER}" bash -lc "cd '${APP_ROOT}/repo' && npm ci && npm run build"

cat >/etc/systemd/system/changethis-web.service <<SERVICE
[Unit]
Description=ChangeThis Next.js web
After=network.target

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_ROOT}/repo/apps/web
EnvironmentFile=/etc/changethis/web.env
Environment=HOSTNAME=${WEB_HOST}
Environment=PORT=${WEB_PORT}
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

cat >/etc/nginx/sites-available/changethis <<NGINX
server {
  listen 80;
  server_name ${APP_DOMAIN};

  location / {
    proxy_pass http://${WEB_HOST}:${WEB_PORT};
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
NGINX

ln -sfn /etc/nginx/sites-available/changethis /etc/nginx/sites-enabled/changethis
nginx -t
systemctl daemon-reload
systemctl enable --now changethis-web
systemctl reload nginx

echo "Frontend installed. Replace placeholder secrets in /etc/changethis/web.env before production use."
