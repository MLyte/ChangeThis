# Deploy Railway + Supabase + OVH pour `app.changethis.dev`

Date: 2026-05-02

Etat actuel: voir [current-state.fr.md](current-state.fr.md).

## Decision de stack beta

Pour le go "base reelle" actuel:

- OVH garde le DNS du domaine `changethis.dev`.
- Railway heberge l'app Next.js.
- Supabase porte l'auth et le store applicatif avec `AUTH_MODE=supabase` et `DATA_STORE=supabase`.
- Railway PostgreSQL natif est reporte: le code actuel ne consomme pas `DATABASE_URL`.
- Brevo/SMTP reste optionnel tant que l'auth Supabase couvre l'envoi d'e-mails.

Ce guide remplace l'ancien chemin `DATA_STORE=file` / Railway PostgreSQL pour la beta reelle. En production beta, `DATA_STORE=file` est un no-go.

## Prerequis

Cote utilisateur:

- Acces GitHub au repo `MLyte/ChangeThis`.
- Acces Railway.
- Acces Supabase.
- Acces OVH DNS pour `changethis.dev`.
- Un secret long pour `CHANGETHIS_SECRET_KEY`.

Cote IA:

- Verifier le repo avec `npm run prod:check` quand les variables sont disponibles.
- Verifier les migrations avec `npm run migrations:check`.
- Lire les erreurs Railway/Supabase si un check ou deploy echoue.

## 1. Creer le service Railway

Dans Railway:

1. Creer ou ouvrir le projet ChangeThis.
2. Ajouter un service `Deploy from GitHub repo`.
3. Selectionner `MLyte/ChangeThis`.
4. Garder un seul service web au depart.
5. Ne pas ajouter Railway PostgreSQL pour ce go, sauf usage futur explicitement separe.

Commandes attendues:

- Build command: `npm run build:prod`
- Start command: `npm run start --workspace @changethis/web`

## 2. Creer le projet Supabase

Dans Supabase:

1. Creer un projet.
2. Choisir une region proche des utilisateurs beta.
3. Recuperer:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Configurer l'URL du site auth sur `https://app.changethis.dev`.
5. Ajouter les redirect URLs utilisees par l'app, notamment:
   - `https://app.changethis.dev/auth/confirm`
   - `https://app.changethis.dev/signup/set-password`

## 3. Appliquer les migrations Supabase

Appliquer les fichiers dans l'ordre:

1. `supabase/migrations/0001_initial_schema.sql`
2. `supabase/migrations/0002_require_single_issue_target_per_project.sql`
3. `supabase/migrations/0003_membership_credentials_public_keys.sql`
4. `supabase/migrations/0004_feedback_resolution_statuses.sql`
5. `supabase/migrations/0005_project_widget_settings.sql`
6. `supabase/migrations/0006_feedback_repository_model_columns.sql`
7. `supabase/migrations/0007_provider_integrations_workspace_storage.sql`

Option CLI Supabase:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

Option SQL Editor:

1. Ouvrir chaque fichier dans l'ordre.
2. Coller le SQL dans Supabase SQL Editor.
3. Executer et attendre le succes avant de passer au suivant.

Check local structure:

```bash
npm run migrations:check
```

## 4. Variables Railway

Dans Railway > service web > Variables:

```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://app.changethis.dev
AUTH_MODE=supabase
DATA_STORE=supabase
ENABLE_PUBLIC_SIGNUP=false
CHANGETHIS_SECRET_KEY=<secret-long-aleatoire>
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SUPABASE_REST_TIMEOUT_MS=10000
```

Ne pas definir en production:

```env
AUTH_MODE=local
DATA_STORE=file
CHANGETHIS_DATA_DIR=.changethis-data
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL=...
```

Ne pas laisser les public keys fallback:

```env
NEXT_PUBLIC_DEMO_PROJECT_KEY=demo_project_key
NEXT_PUBLIC_CHANGETHIS_PROJECT_KEY=changethis_project_key
NEXT_PUBLIC_ANDENNE_BEARS_PROJECT_KEY=andenne_bears_project_key
NEXT_PUBLIC_OPTIMASTER_PROJECT_KEY=optimaster_project_key
NEXT_PUBLIC_YODA_CARROSSERIE_PROJECT_KEY=yoda_carrosserie_project_key
```

GitHub/GitLab peuvent etre ajoutes apres le smoke app + feedback:

```env
GITHUB_APP_SLUG=
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=
GITHUB_WEBHOOK_SECRET=
GITLAB_BASE_URL=https://gitlab.com
GITLAB_OAUTH_APP_ID=
GITLAB_OAUTH_APP_SECRET=
GITLAB_WEBHOOK_SECRET=
```

## 5. Domaine Railway + OVH

Dans Railway:

1. Ouvrir le service web.
2. Aller dans `Settings` > `Domains`.
3. Ajouter `app.changethis.dev`.
4. Copier la cible DNS fournie par Railway.

Dans OVH:

1. Ouvrir `changethis.dev`.
2. Aller dans `Zone DNS`.
3. Ajouter l'enregistrement demande par Railway, souvent:
   - Type: `CNAME`
   - Sous-domaine: `app`
   - Cible: valeur Railway
4. Ne pas ajouter de `A record` concurrent sur `app`.

Attendre ensuite la validation HTTPS dans Railway.

## 6. Verification technique

Apres redeploy Railway:

1. Ouvrir `https://app.changethis.dev/api/health`.
   - Attendu: `200` avec `{ "ok": true }`.
2. Ouvrir `https://app.changethis.dev/api/ready`.
   - Attendu: `200`.
   - Si `503`, lire les checks `auth`, `productionAuth`, `dataStore`, `supabaseService`, `database`, `providerSecrets`.

Check local avec variables chargees:

```bash
npm run env:check
npm run migrations:check
npm run prod:check
```

## 7. Smoke test produit

1. Creer ou connecter le premier compte beta.
2. Verifier que `/projects` est accessible apres login.
3. Creer un site dans `/settings/connected-sites`.
4. Ajouter le domaine autorise.
5. Copier le snippet widget.
6. Envoyer un feedback depuis une origine autorisee.
7. Verifier que le feedback apparait dans `/projects`.
8. Tester logout/login et verifier que les donnees persistent.

Git ensuite:

1. Configurer GitHub ou GitLab.
2. Associer une destination issue au site.
3. Creer manuellement une issue depuis un feedback.
4. Verifier que l'echec est actionnable si le provider manque.

## Go / No-Go

Go beta si:

- `/api/health` retourne `200`.
- `/api/ready` retourne `200`.
- `AUTH_MODE=supabase`.
- `DATA_STORE=supabase`.
- Un feedback reel arrive depuis le widget et apparait dans le dashboard.
- Les secrets ne sont pas dans Git ni dans les logs.
- `ENABLE_PUBLIC_SIGNUP=false` tant que la beta reste privee.

No-Go si:

- `DATA_STORE=file` en production.
- `AUTH_MODE=local` en production.
- `NEXT_PUBLIC_APP_URL` pointe vers localhost ou example.com.
- Railway PostgreSQL est cree en pensant que l'app ecrit dedans.
- Les migrations n'ont pas ete appliquees.
- Les public keys fallback de `.env.example` sont utilisees en production.

## Risques beta acceptes temporairement

- Les screenshots sont encore transitoirement stockes en data URL tant que Supabase Storage n'est pas branche.
- Le rate limit public n'est pas encore un store partage.
- La creation d'issue reste manuelle et doit etre surveillee.
- Les retries provider ne remplacent pas encore une vraie queue durable.
