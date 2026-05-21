#!/usr/bin/env bash
set -euo pipefail

DB_NAME="${DB_NAME:-changethis}"
DB_USER="${DB_USER:-changethis}"
DB_PASSWORD="${DB_PASSWORD:-}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

apt-get update
apt-get install -y postgresql postgresql-contrib

if [[ -z "${DB_PASSWORD}" ]]; then
  DB_PASSWORD="$(python3 - <<'PY'
import secrets
alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
print("".join(secrets.choice(alphabet) for _ in range(32)))
PY
)"
fi

sudo -u postgres psql <<SQL
do \$\$
begin
  if not exists (select from pg_catalog.pg_roles where rolname = '${DB_USER}') then
    create role ${DB_USER} login password '${DB_PASSWORD}';
  else
    alter role ${DB_USER} with login password '${DB_PASSWORD}';
  end if;
end
\$\$;

select 'create database ${DB_NAME} owner ${DB_USER}'
where not exists (select from pg_database where datname = '${DB_NAME}')\\gexec

grant all privileges on database ${DB_NAME} to ${DB_USER};
SQL

cat <<OUT
PostgreSQL ready.
DATABASE_URL=postgresql+asyncpg://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}
Store this value in /etc/changethis/api.env and do not commit it.
OUT
