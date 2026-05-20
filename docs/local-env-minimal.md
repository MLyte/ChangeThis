# Environnement local minimal CRAW

## Python

```bash
python -m pip install -r apps/backend/requirements.txt
```

## JavaScript

```bash
npm install
```

## Variables

```env
PUBLIC_APP_URL=http://localhost:8000
DJANGO_SECRET_KEY=change-me-only-for-local-development
DJANGO_DEBUG=true
ALLOWED_HOSTS=localhost,127.0.0.1
CSRF_TRUSTED_ORIGINS=http://localhost:8000,http://127.0.0.1:8000
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
DATABASE_URL=postgresql://changethis:changethis@localhost:5432/changethis
FILES_ROOT=apps/backend/var/files
TEMP_DIR=apps/backend/var/tmp
```

Optional:

```env
GITHUB_TOKEN=
GITLAB_BASE_URL=https://gitlab.com
GITLAB_TOKEN=
```

## Lancement

```bash
npm run dev --workspace @changethis/frontend
python apps/backend/manage.py runserver 127.0.0.1:8000
```

Ou:

```bash
docker compose up --build
```
