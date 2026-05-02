# Guide debutant: mettre ChangeThis en beta reelle

Ce guide sert a brancher `app.changethis.dev` sur une vraie base et une vraie connexion.

Chemin recommande actuel:

- Railway heberge l'application Next.js.
- Supabase gere l'authentification et la base Postgres.
- OVH garde le DNS de `changethis.dev`.

Important: ne colle jamais les secrets dans Git, dans un message public ou dans une capture d'ecran.

## 0. Ce que tu dois avoir sous la main

- Un compte Railway.
- Un compte Supabase.
- L'acces OVH au domaine `changethis.dev`.
- Le repo GitHub `MLyte/ChangeThis`.
- Un terminal local avec le projet qui fonctionne deja en dev.

## 1. Verifier le projet en local

Dans le terminal, depuis `C:\www\ChangeThis`:

```powershell
npm install
npm run prod:check
npm run typecheck --workspace @changethis/web
```

Si `npm run prod:check` affiche seulement un warning sur les screenshots, ce n'est pas bloquant pour une beta privee.

## 2. Creer le projet Supabase

Dans Supabase:

1. Va sur `https://supabase.com/dashboard`.
2. Clique `New project`.
3. Choisis une organisation.
4. Donne un nom, par exemple `changethis-beta`.
5. Choisis une region proche de tes utilisateurs.
6. Genere un mot de passe DB fort et garde-le dans ton gestionnaire de mots de passe.
7. Attends que le projet soit pret.

Ensuite, va dans `Project Settings > API` et note ces valeurs:

- `Project URL`
- `anon public`
- `service_role`

Tu en auras besoin dans Railway.

## 3. Appliquer les migrations Supabase

Option la plus simple si tu debutes:

1. Ouvre Supabase.
2. Va dans `SQL Editor`.
3. Ouvre localement les fichiers dans `supabase/migrations`.
4. Copie-colle puis execute les fichiers dans cet ordre:
   - `0001_initial_schema.sql`
   - `0002_require_single_issue_target_per_project.sql`
   - `0003_membership_credentials_public_keys.sql`
   - `0004_feedback_resolution_statuses.sql`
   - `0005_project_widget_settings.sql`
   - `0006_feedback_repository_model_columns.sql`
   - `0007_provider_integrations_workspace_storage.sql`
   - `0008_feedback_operational_indexes.sql`

Execute un seul fichier a la fois. Si Supabase affiche une erreur, arrete-toi et garde le message exact.

Verification locale utile:

```powershell
npm run migrations:check
```

## 4. Creer le service Railway

Dans Railway:

1. Va sur `https://railway.app`.
2. Cree un nouveau projet.
3. Choisis `Deploy from GitHub repo`.
4. Selectionne `MLyte/ChangeThis`.
5. Choisis la branche `main`.
6. Dans le service web, configure:
   - Root directory: racine du repo, donc laisse vide si Railway le permet.
   - Build command: `npm run build:prod`
   - Start command: `npm run start --workspace @changethis/web` si Railway ne le detecte pas.

Ne cree pas de Railway PostgreSQL pour ce chemin beta. La base active est Supabase.

Important: `npm run build:prod` est defini dans le `package.json` racine du monorepo. Si Railway force `apps/web` comme root directory, utilise plutot `npm run build` comme build command et garde `npm run start`, mais tu perds alors les checks prod automatiques du monorepo.

## 5. Ajouter les variables Railway

Dans Railway, ouvre ton service web puis `Variables`.

Ajoute:

```env
NODE_ENV=production
RAILWAY_ENVIRONMENT=production
NEXT_PUBLIC_APP_URL=https://app.changethis.dev
APP_URL=https://app.changethis.dev

AUTH_MODE=supabase
DATA_STORE=supabase
ENABLE_PUBLIC_SIGNUP=false

NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_URL=https://PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TON_ANON_KEY
SUPABASE_ANON_KEY=TON_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=TON_SERVICE_ROLE_KEY
SUPABASE_REST_TIMEOUT_MS=10000

CHANGETHIS_SECRET_KEY=UN_SECRET_LONG_ALEATOIRE
```

Pour `CHANGETHIS_SECRET_KEY`, genere une valeur longue. Exemple avec PowerShell:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Optionnel pour GitHub local/prod pilote:

```env
GITHUB_TOKEN=TON_TOKEN_GITHUB
```

Preferer ensuite une GitHub App pour une beta SaaS propre.

## 6. Configurer le domaine Railway

Dans Railway:

1. Ouvre le service web.
2. Va dans `Settings` ou `Networking`.
3. Ajoute le domaine custom `app.changethis.dev`.
4. Railway affiche une cible DNS a copier.

Dans OVH:

1. Va dans le Manager OVH.
2. Ouvre le domaine `changethis.dev`.
3. Va dans `Zone DNS`.
4. Ajoute l'enregistrement demande par Railway.
5. Attends la propagation DNS.

Le HTTPS sera valide quand Railway aura valide le domaine.

## 7. Redployer et verifier

Dans Railway:

1. Lance un redeploiement.
2. Ouvre les logs.
3. Verifie qu'il n'y a pas d'erreur de variables manquantes.

Puis teste dans le navigateur:

- `https://app.changethis.dev/api/health`
- `https://app.changethis.dev/api/ready`
- `https://app.changethis.dev/login`

Attendu:

- `/api/health` doit repondre `ok`.
- `/api/ready` doit etre `ok` si Supabase, les migrations et les variables sont corrects.
- `/login` doit afficher l'ecran de connexion beta.

## 8. Smoke test beta

Checklist manuelle:

- Se connecter ou creer un compte beta selon le flux active.
- Verifier qu'un workspace existe.
- Creer un site connecte.
- Copier le script widget.
- Ouvrir `/demo` ou une page client de test.
- Envoyer un feedback.
- Verifier que le feedback apparait dans `/projects`.
- Tester la creation d'issue GitHub si un token ou une App GitHub est configure.

## 9. Quand demander a l'IA

Demande-moi de reprendre si:

- une migration Supabase echoue;
- Railway refuse de build ou start;
- `/api/ready` renvoie `503`;
- le login Supabase ne marche pas;
- un feedback n'arrive pas dans l'inbox;
- la creation d'issue GitHub echoue.

Dans ce cas, donne-moi seulement:

- le message d'erreur;
- la page ou l'etape concernee;
- jamais les secrets.

## 10. Definition de fini

La beta reelle est prete quand:

- `AUTH_MODE=supabase`;
- `DATA_STORE=supabase`;
- les migrations `0001` a `0008` sont appliquees;
- `app.changethis.dev` pointe vers Railway en HTTPS;
- `/api/health` et `/api/ready` sont OK;
- un feedback reel cree depuis le widget arrive dans `/projects`;
- les secrets ne sont pas dans le repo.
