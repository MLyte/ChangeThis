# Migrer le stockage fichier JSON de apps/web vers Postgres/FastAPI

## Contexte

Le diagnostic précédent a montré que la production (`DATA_STORE=internal` configuré) a des tables Postgres vides (`feedbacks`, `external_issues`, `issue_targets`, `provider_integrations`, `provider_integration_credentials`) alors que l'app est utilisée : seul un module sur cinq (`lib/project-issue-access.ts`) respecte réellement le flag `DATA_STORE` et bascule vers l'API interne FastAPI. Les quatre autres modules de `apps/web/lib/` écrivent toujours dans des fichiers JSON locaux (`CHANGETHIS_DATA_DIR/*.json`), quel que soit l'environnement. C'est le chantier explicitement documenté comme inachevé dans `docs/production-runbook.md` ("Les repositories Next.js doivent encore être migrés progressivement vers le client serveur FastAPI interne").

Objectif : terminer cette migration pour les 4 modules restants, en suivant EXACTEMENT le pattern déjà éprouvé de `lib/project-issue-access.ts` + `apps/api/app/routers/project_issue_members.py` (bascule sur `getDataStoreMode() === "internal"`, fallback fichier conservé pour le dev/tests).

**Décisions validées avec l'utilisateur :**
- Périmètre : les 4 modules (project-registry, feedback-repository, credential-store, provider-integration-state).
- Création de feedback en mode interne : la route Next.js `/api/public/feedback` **proxifie** vers l'endpoint FastAPI existant `POST /public/feedback` (déjà fonctionnel, vérifié par origin) plutôt que dupliquer sa logique.
- Chiffrement des credentials provider (tokens GitHub/GitLab) : fait **côté FastAPI** (AES-256-GCM, nouvelle dépendance Python `cryptography`, nouveau secret `CREDENTIAL_ENCRYPTION_KEY`), réutilisant les colonnes `ciphertext`/`iv`/`tag`/`algorithm` déjà présentes mais inutilisées sur `provider_integration_credentials`.

**Séquençage** (chaque étape reste indépendamment livrable — le mode fichier reste le défaut en dev/CI, rien ne casse si une étape suivante est reportée) :
1. `project-registry.ts` (sites/projets + issue-targets) — le plus simple, prérequis des feedbacks.
2. `feedback-repository.ts` — le plus complexe (state machine), une vraie migration de schéma requise.
3. `credential-store.ts` + `provider-integration-state.ts` — petits mais couplés via `provider-integrations.ts`.

**Déviations assumées par rapport au pattern de référence** (à garder en tête pendant l'implémentation) :
- Certaines fonctions n'ont pas de session (widget public, cron) : elles utilisent de nouveaux endpoints **publics** (sans cookie, vérifiés par origin/clé publique, sur le modèle de l'actuel `POST /public/feedback`) ou un secret bearer (`CHANGETHIS_CRON_SECRET`) plutôt que le cookie de session.
- `apps/api/app/routers/sites.py` n'a aujourd'hui AUCUNE vérification d'auth — corrigé au passage à l'étape 1 (nécessaire puisque du vrai trafic va maintenant y transiter).

---

## Étape 1 — `project-registry.ts` (sites, projets, issue-targets)

### FastAPI

- `apps/api/app/schemas.py` : ajouter `IssueTargetResponse`, `SiteResponse`, `SiteCreateRequest`, `IssueTargetCreateSpec`, `SiteWidgetUpdateRequest`, `IssueTargetUpdateRequest`, `PublicSiteResponse`.
- `apps/api/app/routers/sites.py` : réécrire avec auth (copier le style de `project_issue_members.py` : `changethis_internal_session: str | None = Cookie(default=None)`, `await session_from_token(db, token)`, vérif manuelle `membership.workspace_id`/`role`).
  - `GET /sites?workspace_id=` (session, membre du workspace)
  - `POST /sites` (session, role admin/owner) — crée `Project` + `IssueTarget` en une transaction
  - `PATCH /sites/{public_key}` (session, admin/owner) — settings widget
  - `DELETE /sites/{public_key}` (session, admin/owner)
  - `DELETE /sites?workspace_id=` (session, admin/owner) — bulk clear
  - `PUT /sites/{public_key}/issue-target` (session, admin/owner) — upsert (unique sur `project_id`)
- Nouveau routeur public `apps/api/app/routers/public_projects.py` (pas de `Cookie`/session, comme l'actuel `feedback.py` public, session `AsyncSessionLocal()` directe) :
  - `GET /public/projects/{public_key}` — remplace la lookup publique de `findConfiguredProjectByKey(key)` sans workspaceId
  - `GET /public/origins/known?origin=` — remplace `isKnownOrigin`
- `apps/api/app/main.py` : enregistrer `public_projects.router`.
- Pas de migration Alembic nécessaire (schéma déjà suffisant pour cette étape).

### apps/web

Dans `lib/project-registry.ts`, ajouter `usesInternalProjectRegistry()` (copie de `usesInternalProjectIssueAccess()`), et une branche interne pour chaque fonction exportée sauf les 3 pures (`ensureIssueTargetConfigured`, `installSnippet`, `ensureWorkspaceDemoProject`) :

- `listConfiguredProjects(workspaceId)` → `GET /sites?workspace_id=` avec cookie
- `findConfiguredProjectByKey(key, workspaceId?)` → si `workspaceId` fourni, réutilise la liste interne ; sinon **branche publique sans cookie** vers `GET /public/projects/{key}`
- `createConnectedSite` → `POST /sites`
- `updateProjectWidgetSettings` → `PATCH /sites/{key}`
- `deleteConnectedSite` → `DELETE /sites/{key}`
- `clearConnectedSites` → `DELETE /sites?workspace_id=`
- `saveProjectIssueTarget` → `PUT /sites/{key}/issue-target`
- `isKnownOrigin` → `GET /public/origins/known?origin=` (sans cookie)

Mapper les erreurs non-2xx vers `ProjectTargetValidationError(message, response.status)` (le `.status` est lu par les routes appelantes). Ajouter un helper `mapInternalSite(row)` snake_case → camelCase.

### Tests

- Python : `apps/api/tests/test_sites.py`, `test_public_projects.py` (nouveaux) — convention existante : pas de vraie DB, appel direct des coroutines, `monkeypatch` de `require_workspace_session`, `CapturingDb`/`FakeDb` faisant juste `execute()`.
- TS : nouveau `apps/web/test/project-registry-internal.test.ts` — `DATA_STORE=internal`, mock de `globalThis.fetch`, vérifie méthode/URL/body de chaque appel. Les tests existants (`project-registry.test.ts`, `project-issue-access.test.ts`) restent inchangés (mode fichier).

### Vérification

1. `cd apps/api && alembic upgrade head && uv run uvicorn app.main:app --reload`
2. `cd apps/web && DATA_STORE=internal INTERNAL_API_URL=http://127.0.0.1:8000 npm run dev`
3. Créer un site connecté depuis l'UI → vérifier en `psql` que `projects` et `issue_targets` reçoivent une ligne.
4. Charger le widget depuis une page non authentifiée → `/api/widget/config` doit toujours résoudre (exerce la branche publique).
5. `cd apps/api && uv run pytest tests/test_sites.py tests/test_public_projects.py -q`

---

## Étape 2 — `feedback-repository.ts`

### Migration Alembic requise

`Feedback` n'a qu'un seul jeu de colonnes `screenshot_*`, mais l'interface `FeedbackRepository` a besoin de DEUX assets indépendants (`screenshotAsset` et `browserCaptureAsset` via `recordBrowserCapture`). Nouvelle migration `apps/api/alembic/versions/0006_feedback_browser_capture_asset.py` (style idempotent habituel, `alter table ... add column if not exists`) ajoutant sur `feedbacks` : `screenshot_kind`, `browser_capture_mime_type`, `browser_capture_bytes`, `browser_capture_data_url`, `browser_capture_thumbnail_data_url`, `browser_capture_storage_path`, `browser_capture_hash`, `browser_capture_status` (default `active`), `browser_capture_last_used_at`, `browser_capture_usage_count` (default 0), `browser_capture_archived_at`, `browser_capture_deleted_at`, `browser_capture_created_at`. Ajouter les `Mapped[...]` correspondants dans `models.py`.

### FastAPI

- `apps/api/app/schemas.py` : ajouter `FeedbackFullResponse`, `AssetResponse`, `ExternalIssueResponse`, `FeedbackEventResponse`, et les request bodies (`UpdateReporterRequest`, `UpdateIssueDraftRequest`, `RecordIssueAttemptOkRequest`/`FailedRequest`, `RecordExternalIssueStateRequest`, `RecordBrowserCaptureRequest`).
- Nouveau routeur authentifié `apps/api/app/routers/feedbacks.py` (le routeur public existant `feedback.py` n'est pas touché, sauf pour y ajouter 2 sous-routes publiques — voir ci-dessous) :
  - `GET /feedbacks` (filtres `project_key`, `status`, `workspace_id`)
  - `GET /feedbacks/{id}`
  - `PATCH /feedbacks/{id}/issue-draft` (le web recalcule le brouillon via `buildIssueDraft` de `@changethis/shared` et envoie juste `title/description/labels` — pas de portage Python de cette logique métier)
  - `POST /feedbacks/{id}/issue-pending`
  - `POST /feedbacks/{id}/issue-attempt` (variante ok/failed ; upsert `provider_issue_attempts` sur `(provider, idempotency_key)`, insert `feedback_status_events`, update `feedbacks.status`)
  - `POST /feedbacks/{id}/external-issue-state` (upsert `external_issues`, unique sur `feedback_id`)
  - `POST /feedbacks/{id}/keep` / `/resolve` / `/ignore`
  - `GET /feedbacks/due-for-retry`
  - `GET /feedbacks/{id}/events`
  - `DELETE /feedbacks?workspace_id=` (admin/owner)
  - `POST /feedbacks/cleanup-screenshots` (secret bearer `CHANGETHIS_CRON_SECRET` via un petit helper `require_cron_secret`, pas de session)
- Sur le routeur public existant `feedback.py`, ajouter (même style : origin-check, pas de cookie) :
  - `PATCH /public/feedback/{id}/reporter`
  - `POST /public/feedback/{id}/browser-capture`
  - (`.../cancel` existant est réutilisable tel quel puisqu'il ne fait qu'un `markIgnored`)
- `apps/api/app/main.py` : enregistrer `feedbacks.router`.

### apps/web

- **Création de feedback** : `app/api/public/feedback/route.ts` proxifie désormais vers `POST {INTERNAL_API_URL}/public/feedback` en mode interne (au lieu d'appeler `getFeedbackRepository().create()`), puis enchaîne capture/brouillon/création auto d'issue à partir de l'id retourné. En mode fichier, comportement inchangé.
- `lib/feedback-repository.ts` : ajouter une classe `InternalFeedbackRepository implements FeedbackRepository` (nouvelle classe sœur, `FileFeedbackRepository` reste exportée telle quelle car un test la construit directement). `getFeedbackRepository()` choisit l'implémentation selon `getDataStoreMode()`. Chaque méthode mappe vers l'endpoint correspondant ci-dessus ; `updateReporter`/`recordBrowserCapture` basculent vers la variante publique (`/public/feedback/{id}/...`) quand `filters.workspaceId` est absent, même logique que la branche publique de l'étape 1.
- Mapping `mapInternalFeedback(row)` snake_case → `StoredFeedback`.

### Tests

- Python : `apps/api/tests/test_feedbacks.py` (nouveau) — en particulier la logique d'upsert `issue-attempt` (ok → `sent_to_provider` + reset retry ; failed → incrément `retry_count`, statut `retrying`/`failed`), vérifiée sur les substrings SQL comme dans `test_project_issue_members.py`.
- TS : `apps/web/test/feedback-repository-internal.test.ts` (nouveau) — mock `fetch`, parcourt le state machine complet. `feedback-repository.test.ts` existant reste inchangé.

### Vérification

1. `alembic upgrade head` (applique `0006_...`).
2. Soumettre un feedback widget avec `DATA_STORE=internal` → vérifier en `psql` que `feedbacks.payload` (JSONB) et `project_id`/`issue_target_id` sont peuplés.
3. Créer une issue manuellement depuis l'inbox → vérifier `provider_issue_attempts` et `external_issues`, et la transition de `feedbacks.status`.
4. `pytest tests/test_feedbacks.py -q`

---

## Étape 3 — `credential-store.ts` + `provider-integration-state.ts`

### FastAPI

- Nouveau module `apps/api/app/crypto.py` : `encrypt_credential(plaintext) -> (ciphertext_b64, iv_b64, tag_b64)`, `decrypt_credential(...)`, dérivant la clé de `Settings.credential_encryption_key` (nouvel env `CREDENTIAL_ENCRYPTION_KEY`, requis en prod comme `SESSION_SECRET`). Ajouter `cryptography` à `apps/api/pyproject.toml`.
- Migration `apps/api/alembic/versions/0007_provider_credential_unique.py` : contrainte unique `(integration_id, credential_kind)` sur `provider_integration_credentials` (nécessaire pour l'upsert — actuellement absente).
- `apps/api/app/schemas.py` : `ProviderIntegrationEnsureRequest`, `ProviderIntegrationResponse`, `CredentialSaveRequest`, `CredentialResponse`, `CredentialValueResponse`.
- Réécrire `apps/api/app/routers/integrations.py` (garder le `GET /{provider}/repositories` stub existant tel quel — la liste de repos reste côté Node via `issue-providers.ts`) :
  - `POST /integrations/{provider}/ensure` (session, admin/owner) — get-or-create la ligne `ProviderIntegration` pour `(workspace_id, provider)`, remplace les ids synthétiques `"local-github"`/`"local-gitlab"`
  - `GET /integrations/{provider}?integration_id=`
  - `PATCH /integrations/{provider}/status` (body `{integration_id, status}`) — active/désactive
  - `POST /integrations/{provider}/credentials` (chiffre via `crypto.py`, upsert)
  - `GET /integrations/{provider}/credentials?integration_id=&kind=` (retourne le secret déchiffré — accès restreint admin/owner)
  - `DELETE /integrations/{provider}/credentials?integration_id=`
- `apps/api/app/main.py` : déjà enregistré (routeur existant), pas de changement d'enregistrement nécessaire au-delà du contenu.

### apps/web

- `credential-store.ts` : garder les exports synchrones inchangés (mode fichier). Les wrappers `*Async` (`saveProviderCredentialSecretAsync`, `getProviderCredentialSecretAsync`, `deleteProviderCredentialSecretsAsync`) gagnent une branche interne vers les endpoints ci-dessus.
- `provider-integration-state.ts` : même schéma pour `isProviderIntegrationDisabledAsync`/`disableProviderIntegrationAsync`/`enableProviderIntegrationAsync` → `PATCH /integrations/{provider}/status`.
- `provider-integrations.ts` : `getRuntimeProviderIntegrations` devient `async` (et les fonctions qui l'appellent : `listProviderIntegrations`, `getProviderIntegration`, `getProviderIntegrationToken`, `getProviderConnectUrl` devienent `async function` ; les `*Async` existants deviennent de simples passthroughs). Aucun appelant externe n'utilise les noms synchrones (vérifié par grep) — à revérifier avec un grep frais au moment de l'implémentation avant de merger, du code ayant pu changer entretemps. En mode interne, résoudre les vrais ids d'intégration via `POST /integrations/{provider}/ensure` au lieu des ids synthétiques. `recordProviderConnection` (actuellement un no-op) obtient un vrai corps : `ensure` puis `PATCH .../status` avec les métadonnées de connexion.

### Tests

- Python : `apps/api/tests/test_crypto.py` (roundtrip chiffrement/déchiffrement, détection de falsification), `test_integrations.py` (ensure idempotent, save/get credential, toggle status).
- TS : `credential-store-internal.test.ts`, `provider-integration-state-internal.test.ts`, `provider-integrations-internal.test.ts` (nouveaux, mock `fetch`).

### Vérification

1. `CREDENTIAL_ENCRYPTION_KEY=... alembic upgrade head`.
2. Connecter un token GitHub via l'UI Settings avec `DATA_STORE=internal` → vérifier en `psql` que `provider_integrations` a une vraie ligne et que `ciphertext`/`iv`/`tag` sont non-nuls et non lisibles en clair.
3. Déconnecter → `status` bascule, la liste des repos échoue proprement ensuite.
4. `pytest tests/test_crypto.py tests/test_integrations.py -q`

---

## Vérification globale (une fois les 3 étapes livrées)

Parcours complet avec Postgres local + `apps/api` (`alembic upgrade head`) + `apps/web` en `DATA_STORE=internal` : inscription → connexion d'un repo → connexion d'un token GitHub → soumission d'un feedback widget depuis un onglet non authentifié → création d'issue → résolution. Vérifier en `psql` que `projects`, `issue_targets`, `feedbacks`, `feedback_status_events`, `provider_issue_attempts`, `external_issues`, `provider_integrations`, `provider_integration_credentials` sont toutes non vides et cohérentes (FKs résolues, pas d'orphelins). Lancer les suites complètes `cd apps/api && uv run pytest -q` et `cd apps/web && npm test`.
