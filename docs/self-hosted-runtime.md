# Runtime self-hosted experimental

Cette branche `infra/self-hosted-runtime` ajoute un plan B de runtime pour lancer ChangeThis hors Railway, sans remplacer Supabase.

## Roles

- OVH: domaine public et DNS, par exemple `app.example.com` vers le serveur ou le proxy.
- Supabase: PostgreSQL, Auth et Storage restent le service data principal.
- Railway: runtime actuel de la branche principale.
- Self-hosted: runtime alternatif pour VPS OVH, Hetzner, Coolify ou Proxmox/LXC.

## Stack detectee

- Monorepo npm workspaces.
- Web app: Next.js dans `apps/web`.
- Widget: Vite dans `packages/widget`.
- Shared package: TypeScript dans `packages/shared`.
- Build production: `npm run build`.
- Start production: `npm run start --workspace @changethis/web`.
- Port: `PORT` si fourni, sinon Next.js utilise `3000`.
- Data production: `AUTH_MODE=supabase` et `DATA_STORE=supabase`.

Il n'y a pas de dependance Railway obligatoire dans le runtime. Les variables `RAILWAY_*` ne servent qu'a enrichir `/api/health` quand elles existent.

## Variables minimales

Partir de `.env.production.example`, puis renseigner au minimum:

```env
NEXT_PUBLIC_APP_URL=https://app.example.com
PORT=3000
AUTH_MODE=supabase
DATA_STORE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<public-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<server-service-role-key>
CHANGETHIS_SECRET_KEY=<32+ chars random secret>
CHANGETHIS_CRON_SECRET=<random cron secret>
```

Ajouter ensuite les variables GitHub/GitLab selon le mode d'integration choisi. Ne jamais committer de fichier `.env` reel.

## Commandes locales

```bash
npm ci
npm run build
npm run start --workspace @changethis/web
```

## Docker

Build et lancement direct:

```bash
docker build -t changethis:self-hosted .
docker run --rm -p 3000:3000 --env-file .env.production changethis:self-hosted
```

Avec Compose:

```bash
docker compose --env-file .env.production up --build
```

Le service expose le port conteneur `3000` et mappe `${PORT:-3000}:3000` cote hote.

## Notes de deploiement

### Coolify

- Utiliser le Dockerfile du repo.
- Definir toutes les variables d'environnement dans Coolify, pas dans l'image.
- Configurer le domaine public sur `NEXT_PUBLIC_APP_URL`.
- Garder Supabase externe pour DB/Auth/Storage.

### VPS classique

- Installer Docker et le plugin Compose.
- Copier le repo ou deployer depuis Git.
- Creer un fichier `.env.production` hors Git.
- Lancer `docker compose --env-file .env.production up -d --build`.
- Placer Nginx ou Caddy devant le conteneur.

### Reverse proxy Nginx/Caddy

- Terminer TLS au niveau du proxy.
- Proxy pass vers `http://127.0.0.1:3000`.
- Transmettre `Host`, `X-Forwarded-Proto` et `X-Forwarded-For`.
- `NEXT_PUBLIC_APP_URL` doit etre l'URL HTTPS publique finale, pas l'URL interne du conteneur.

## Reste a faire avant migration prod

- Pointer le DNS OVH vers le nouveau serveur ou proxy.
- Valider `/api/health`, `/api/ready`, signup/login Supabase et creation d'issue depuis le domaine final.
- Configurer les callbacks OAuth GitHub/GitLab sur l'URL publique self-hosted.
- Decider ou executer les endpoints cron, notamment `/api/cron/storage-cleanup`.
