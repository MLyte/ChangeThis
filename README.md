# ChangeThis CRAW

## What Is Different From `main` And Why

`CRAW` is the self-hosted CRA-W branch. It deliberately removes the hosted `main` runtime assumptions: no Supabase, no Railway, and no Next.js runtime. The target stack is Vue 3 + Vite + TypeScript + Pinia for the frontend, Django for auth/API/admin/jobs, PostgreSQL/PostGIS for data, and the CRA-W server filesystem for screenshots and generated files.

This branch exists so CRA-W can install and operate ChangeThis on controlled servers, with ordinary backups, mounted storage or NAS paths, Django migrations, and no required external platform except optional GitHub/GitLab integrations.

## Stack

- `apps/frontend`: Vue 3 SPA with Vite, TypeScript, Pinia and Vue Router.
- `apps/backend`: Django backend with sessions, JSON API, Django admin, migrations, local file storage and synchronous job commands.
- `packages/widget`: embeddable feedback widget, served by Django as `/widget.js` and `/widget.global.js`.
- `packages/shared`: shared TypeScript protocol and widget types.
- PostgreSQL/PostGIS: official database target.
- Filesystem storage: `FILES_ROOT`, with NAS support through a system mount or Docker volume.

## Public Interfaces

Core environment:

```env
PUBLIC_APP_URL=https://app.example.internal
DJANGO_SECRET_KEY=replace-with-a-long-secret
DATABASE_URL=postgresql://changethis:PASSWORD@postgres:5432/changethis
FILES_ROOT=/var/lib/changethis/files
TEMP_DIR=/var/lib/changethis/tmp
ALLOWED_HOSTS=app.example.internal
CSRF_TRUSTED_ORIGINS=https://app.example.internal
```

Optional provider integrations:

```env
GITHUB_TOKEN=
GITLAB_BASE_URL=https://gitlab.com
GITLAB_TOKEN=
```

## Development

Install JavaScript dependencies:

```bash
npm install
```

Install Python dependencies:

```bash
python -m pip install -r apps/backend/requirements.txt
```

Run the frontend:

```bash
npm run dev --workspace @changethis/frontend
```

Run Django:

```bash
python apps/backend/manage.py migrate
python apps/backend/manage.py runserver 127.0.0.1:8000
```

The Vue dev server proxies `/api`, `/widget.js`, and `/widget.global.js` to Django.

## Docker

```bash
docker compose up --build
```

Compose starts:

- `frontend` on `http://localhost:5173`;
- `backend` on `http://localhost:8000`;
- `postgres` with PostGIS enabled.

For a single public entrypoint, put the CRA-W reverse proxy in front of Django. Django can serve the built SPA and widget bundles directly.

## API Contract

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`
- `GET /api/widget/config?project=...`
- `POST /api/public/feedback`
- `POST /api/public/feedback/:id/cancel`
- `POST /api/public/feedback/:id/reporter`
- `GET /api/projects/feedbacks`
- `GET|POST /api/projects/sites`
- `GET|POST /api/projects/issue-targets`
- `GET /api/workspace/members`
- `GET /api/health`
- `GET /api/ready`

## Storage And Jobs

Screenshots are decoded by Django and written atomically under:

```txt
FILES_ROOT/<workspace>/<project>/<date>/
```

The database stores only relative path, hash, byte size, MIME type and status metadata.

Synchronous maintenance commands:

```bash
python apps/backend/manage.py run_due_jobs
python apps/backend/manage.py cleanup_storage
```

## Validation

```bash
npm run build
npm run typecheck
python apps/backend/manage.py check
docker compose config
```

## License

ChangeThis is licensed under the European Union Public Licence, version 1.2 (`EUPL-1.2`). Third-party dependencies remain under their own licenses.

## Repository Structure

```txt
apps/frontend       Vue 3 + Vite SPA
apps/backend        Django API/auth/admin/jobs
packages/widget     Embeddable browser widget
packages/shared     Shared TypeScript protocol
docs                Current and historical technical notes
```
