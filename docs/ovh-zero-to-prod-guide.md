# Guide serveur CRAW/OVH

Ce guide decrit la cible CRAW actuelle: Vue + Django + PostgreSQL/PostGIS + stockage disque serveur.

## Prerequis

- Serveur Linux gere par CRA-W.
- Docker et Docker Compose, ou equivalent supervise par l'equipe infrastructure.
- Reverse proxy externe, par exemple Nginx ou Caddy.
- Volume disque ou NAS monte pour `FILES_ROOT`.

## Variables

```env
PUBLIC_APP_URL=https://app.example.internal
DJANGO_SECRET_KEY=replace-with-long-secret
DATABASE_URL=postgresql://changethis:PASSWORD@postgres:5432/changethis
FILES_ROOT=/var/lib/changethis/files
TEMP_DIR=/var/lib/changethis/tmp
ALLOWED_HOSTS=app.example.internal
CSRF_TRUSTED_ORIGINS=https://app.example.internal
```

## Demarrage

```bash
docker compose up --build -d
docker compose exec backend python apps/backend/manage.py migrate
docker compose exec backend python apps/backend/manage.py createsuperuser
```

## Verification

```bash
curl https://app.example.internal/api/health
curl https://app.example.internal/api/ready
```

`/api/ready` doit confirmer la base, PostGIS, le stockage et le bundle widget.
