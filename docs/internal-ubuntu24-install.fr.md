# Installation interne Ubuntu 24

Date de reference: 2026-05-21

Ce runbook decrit la cible interne active `Next.js + FastAPI + PostgreSQL` pour ChangeThis. C'est le chemin de reference de la branche `main` pour l'installation CRA.

## Architecture cible

- Domaine applicatif: `https://changethis.cra.wallonie.be`.
- Frontend: Next.js `apps/web`, service `changethis-web.service`, ecoute locale `127.0.0.1:3000` sur `frontend.toolprod`.
- Backend: FastAPI `apps/api`, service `changethis-api.service`, ecoute `0.0.0.0:8000` ou IP privee backend sur `back.toolprod`.
- Donnees: PostgreSQL interne, role applicatif limite `changethis`.
- Proxy: vhost frontal `changethis.cra.wallonie.be` vers Next.js. Les routes navigateur restent sous le meme domaine; Next.js peut proxyfier vers FastAPI via `INTERNAL_API_URL`.
- Secrets: fichiers `/etc/changethis/web.env` et `/etc/changethis/api.env`, lisibles par l'utilisateur applicatif uniquement.

Les PDF infra presents dans `docs/` sont utilises comme sources d'adaptation:

- `docs/*utilisateur applicatif sur serveur frontend.pdf`: principe conserve avec l'utilisateur systeme `changethis`.
- `docs/VHOST config.pdf`: principe conserve, mais le vhost proxyfie vers Node/Next.js au lieu d'Apache/PHP.
- `docs/MySQL DB_USER config.pdf`: principe adapte a PostgreSQL; MySQL est remplace par un role et une base PostgreSQL.

## Prerequis

- Ubuntu 24.04 sur les serveurs frontend et backend.
- Acces root ou sudo.
- Resolution DNS interne:
  - `changethis.cra.wallonie.be` vers le frontal.
  - `back.toolprod` vers le serveur backend ou son IP privee.
- Cle SSH GitRural installee pour l'utilisateur `changethis` ou agent SSH disponible pendant l'installation.
- PostgreSQL installe sur le backend, ou installe par `scripts/internal/setup-postgres.sh`.
- Certificat TLS gere par l'infra frontale. Le script nginx fourni installe un vhost HTTP minimal; adaptez la terminaison HTTPS selon le standard Toolprod.

## Variables

Frontend `/etc/changethis/web.env`:

```env
NODE_ENV=production
AUTH_MODE=internal
DATA_STORE=internal
NEXT_PUBLIC_APP_URL=https://changethis.cra.wallonie.be
INTERNAL_API_URL=http://back.toolprod:8000
CHANGETHIS_SECRET_KEY=<secret-32-caracteres-minimum>
```

Backend `/etc/changethis/api.env`:

```env
DATABASE_URL=postgresql+asyncpg://changethis:<secret>@localhost:5432/changethis
SESSION_SECRET=<secret-32-caracteres-minimum>
CHANGETHIS_SECRET_KEY=<secret-32-caracteres-minimum>
ALLOWED_PUBLIC_ORIGINS=https://changethis.cra.wallonie.be
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=
GITLAB_OAUTH_APP_ID=
GITLAB_OAUTH_APP_SECRET=
```

## Installation backend

1. Creer la base et le role PostgreSQL:

```bash
sudo DB_NAME=changethis DB_USER=changethis scripts/internal/setup-postgres.sh
```

2. Copier la `DATABASE_URL` affichee dans `/etc/changethis/api.env`.

3. Installer l'API:

```bash
sudo REPO_URL=git@gitrural:ChangeThis.git scripts/internal/install-backend.sh
```

4. Appliquer le schema:

```bash
sudo -u changethis bash -lc 'set -a && . /etc/changethis/api.env && set +a && cd /opt/changethis/repo/apps/api && . .venv/bin/activate && alembic upgrade head'
```

5. Verifier:

```bash
systemctl status changethis-api
curl -fsS http://back.toolprod:8000/health
curl -fsS http://back.toolprod:8000/ready
```

## Installation frontend

1. Installer Next.js et le vhost:

```bash
sudo \
  REPO_URL=git@gitrural:ChangeThis.git \
  APP_DOMAIN=changethis.cra.wallonie.be \
  INTERNAL_API_URL=http://back.toolprod:8000 \
  scripts/internal/install-frontend.sh
```

2. Remplacer les secrets placeholders dans `/etc/changethis/web.env`.

3. Verifier:

```bash
systemctl status changethis-web
curl -fsS https://changethis.cra.wallonie.be/api/health
curl -fsS https://changethis.cra.wallonie.be/api/ready
```

## Deploiement courant deux serveurs

Sur le serveur backend:

```bash
cd /opt/changethis/repo
sudo API_URL=http://back.toolprod:8000 scripts/internal/deploy-backend.sh
```

Le script backend fait:

- `git pull --ff-only`
- installation editable Python `apps/api`
- `alembic upgrade head`
- restart `changethis-api`
- smoke checks FastAPI `/health` et `/ready`

Sur le serveur frontend:

```bash
cd /opt/changethis/repo
sudo APP_URL=https://changethis.cra.wallonie.be scripts/internal/deploy-frontend.sh
```

Le script frontend fait:

- `git pull --ff-only`
- `npm ci`
- build `shared`, `widget`, `web`
- restart `changethis-web`
- smoke checks publics `/api/health` et `/api/ready`

Le script `scripts/internal/deploy.sh` reste disponible pour une installation monserveur, mais il n'est pas adapte a deux machines separees.

## Rollback

Rollback applicatif:

```bash
cd /opt/changethis/repo
sudo -u changethis git log --oneline -5
sudo -u changethis git checkout <commit-stable>
sudo npm ci
sudo npm run build
sudo systemctl restart changethis-web changethis-api
```

Rollback DB:

```bash
sudo -u changethis bash -lc 'cd /opt/changethis/repo/apps/api && . .venv/bin/activate && alembic downgrade -1'
```

Avant tout rollback DB, faire un dump:

```bash
sudo -u postgres pg_dump changethis > /var/backups/changethis-$(date +%F-%H%M).sql
```

## Smoke tests fonctionnels

- `curl https://changethis.cra.wallonie.be/api/ready` doit retourner `ok: true`.
- Charger `/widget.js` depuis un site autorise.
- Soumettre un feedback depuis une origine presente dans `projects.allowed_origins`.
- Verifier la ligne en base:

```sql
select id, status, type, page_url, created_at
from feedbacks
order by created_at desc
limit 5;
```

- Verifier la presence dans l'inbox lorsque le repository Next.js aura ete migre vers FastAPI.

## Limites connues de cette premiere conversion

- `apps/api` fournit le schema interne, l'auth email/mot de passe, les sessions, la config widget, la reception feedback, l'inbox et les endpoints d'amorcage sites/destinations.
- Les repositories Next.js existants restent a migrer progressivement vers le client FastAPI serveur.
- Les integrations GitHub/GitLab cote FastAPI ont un endpoint reserve; la logique provider complete reste a porter depuis `apps/web/lib`.
- Les screenshots restent compatibles avec le modele actuel, mais le stockage objet interne n'est pas branche.
