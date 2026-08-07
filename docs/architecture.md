# Architecture

Etat actuel: voir [current-state.fr.md](current-state.fr.md). Ce document decrit l'architecture active de l'installation interne CRA au 2026-05-21.

## Monorepo

- `apps/web`: application Next.js App Router, admin, routes API navigateur et host du widget.
- `apps/api`: backend FastAPI interne, PostgreSQL, SQLAlchemy et Alembic.
- `packages/widget`: widget public charge par les sites clients ou internes.
- `packages/shared`: types et validation de payload partages entre app et widget.
- `scripts/internal`: installation native Ubuntu 24 et deploy `systemd`.
- `docs/archive`: documents historiques, non actifs pour l'installation interne.

## Profil de runtime actif

| Profil | Usage | Auth | Store | Domaine |
|---|---|---|---|---|
| Local | Dev produit/front | `AUTH_MODE=local` | `DATA_STORE=file` | `http://127.0.0.1:3000` |
| Interne CRA | Installation cible | `AUTH_MODE=internal` | `DATA_STORE=internal` | `https://changethis.cra.wallonie.be` |

## Flux global

```mermaid
flowchart TB
  Visitor["Visiteur site client/interne"] --> Widget["packages/widget"]
  Team["Equipe UX / produit / dev"] --> Dashboard["Admin Next.js<br/>apps/web"]

  Widget --> PublicApi["Next.js API publique<br/>/api/public/feedback"]
  Dashboard --> PrivateApi["Next.js API admin<br/>/api/projects/*"]

  PublicApi --> FastAPI["FastAPI interne<br/>apps/api"]
  PrivateApi --> FastAPI

  FastAPI --> Postgres["PostgreSQL interne"]
  FastAPI --> Providers["Git provider layer"]
  Providers --> GitHub["GitHub Issues"]
  Providers --> GitLab["GitLab Issues"]
```

## Dataflow feedback

```mermaid
sequenceDiagram
  participant Site as Site avec widget
  participant Widget as Widget ChangeThis
  participant Next as Next.js meme domaine
  participant API as FastAPI interne
  participant DB as PostgreSQL
  participant Git as GitHub/GitLab

  Site->>Widget: Chargement /widget.js + data-project
  Widget->>Next: GET /api/widget/config?project=...
  Next->>API: Lecture configuration site
  API->>DB: Project, origine autorisee, options widget
  Widget->>Next: POST /api/public/feedback
  Next->>API: Validation + creation feedback
  API->>DB: Feedback, events, statut
  Next->>API: Action admin creer issue
  API->>Git: Creation issue si demandee
  API->>DB: Statut provider + external_url
```

## Modele de donnees

Schema PostgreSQL (`apps/api/app/models.py`), issu des migrations Alembic sous `apps/api/alembic/versions/`. `alembic_version` (suivi technique des migrations) n'est pas representee.

```mermaid
erDiagram
    USERS ||--o{ MEMBERSHIPS : "has"
    USERS ||--o{ WORKSPACES : "owns"
    USERS ||--o{ SESSIONS : "has"
    USERS ||--o{ PROJECT_ISSUE_MEMBERS : "granted"

    WORKSPACES ||--o{ MEMBERSHIPS : "has"
    WORKSPACES ||--o{ PROJECTS : "has"
    WORKSPACES ||--o{ PROJECT_ISSUE_MEMBERS : "scopes"
    WORKSPACES ||--o{ PROVIDER_INTEGRATIONS : "has"

    PROJECTS ||--o{ PROJECT_PUBLIC_KEYS : "has"
    PROJECTS ||--o{ PROJECT_ISSUE_MEMBERS : "grants access to"
    PROJECTS ||--o| ISSUE_TARGETS : "routes to"
    PROJECTS ||--o{ FEEDBACKS : "receives"

    PROVIDER_INTEGRATIONS ||--o{ PROVIDER_INTEGRATION_CREDENTIALS : "has"
    PROVIDER_INTEGRATIONS ||--o{ ISSUE_TARGETS : "used by"

    ISSUE_TARGETS ||--o{ FEEDBACKS : "default route for"
    ISSUE_TARGETS ||--o{ EXTERNAL_ISSUES : "target of"

    FEEDBACKS ||--o{ FEEDBACK_STATUS_EVENTS : "has"
    FEEDBACKS ||--o{ PROVIDER_ISSUE_ATTEMPTS : "has"
    FEEDBACKS ||--o| EXTERNAL_ISSUES : "creates"

    USERS {
        uuid id PK
        text email UK
        text password_hash
        text display_name
        text status
        timestamptz created_at
        timestamptz updated_at
    }

    WORKSPACES {
        uuid id PK
        text name
        uuid owner_id FK
        text plan
        timestamptz created_at
        timestamptz updated_at
    }

    MEMBERSHIPS {
        uuid id PK
        uuid workspace_id FK
        uuid user_id FK
        text role
        text status
        uuid invited_by FK
        timestamptz invited_at
        timestamptz joined_at
        timestamptz created_at
        timestamptz updated_at
    }

    SESSIONS {
        uuid id PK
        uuid user_id FK
        text token_hash UK
        timestamptz expires_at
        timestamptz revoked_at
        timestamptz created_at
        timestamptz updated_at
    }

    PROJECTS {
        uuid id PK
        uuid workspace_id FK
        text name
        text public_key UK
        text_array allowed_origins
        text widget_locale
        text widget_button_position
        text widget_button_variant
        text widget_display_mode
        text widget_reporter_fields
        text widget_title
        text_array widget_modes
        text issue_creation_mode
        timestamptz created_at
        timestamptz updated_at
    }

    PROJECT_PUBLIC_KEYS {
        uuid id PK
        uuid project_id FK
        text public_key UK
        text status
        uuid rotated_from_key_id FK
        timestamptz created_at
        timestamptz activated_at
        timestamptz retired_at
    }

    PROJECT_ISSUE_MEMBERS {
        uuid id PK
        uuid workspace_id FK
        uuid project_id FK
        text project_key
        uuid user_id FK
        text role
        text status
        timestamptz created_at
        timestamptz updated_at
    }

    PROVIDER_INTEGRATIONS {
        uuid id PK
        uuid workspace_id FK
        text provider
        text auth_type
        text external_account_id
        text installation_id
        text base_url
        text status
        timestamptz created_at
        timestamptz updated_at
    }

    PROVIDER_INTEGRATION_CREDENTIALS {
        uuid id PK
        uuid integration_id FK
        text credential_kind
        text storage_reference
        text display_name
        text_array scopes
        text fingerprint_sha256
        text ciphertext
        text iv
        text tag
        text algorithm
        text status
        timestamptz expires_at
        timestamptz last_validated_at
        timestamptz rotated_at
        timestamptz created_at
        timestamptz updated_at
    }

    ISSUE_TARGETS {
        uuid id PK
        uuid project_id FK "unique"
        uuid integration_id FK
        text provider
        text namespace
        text project_name
        text external_project_id
        text web_url
        timestamptz created_at
    }

    FEEDBACKS {
        uuid id PK
        uuid project_id FK
        uuid issue_target_id FK
        text status
        text type
        text message
        text page_url
        text page_title
        text browser
        integer viewport_width
        integer viewport_height
        numeric device_pixel_ratio
        integer pin_x
        integer pin_y
        text element_selector
        jsonb payload
        text issue_draft_title
        text issue_draft_description
        text_array issue_draft_labels
        text screenshot_status
        text browser_capture_status
        timestamptz created_at
        timestamptz updated_at
    }

    FEEDBACK_STATUS_EVENTS {
        uuid id PK
        uuid feedback_id FK
        text from_status
        text to_status
        text reason
        text provider
        text external_url
        timestamptz created_at
    }

    PROVIDER_ISSUE_ATTEMPTS {
        uuid id PK
        uuid feedback_id FK
        text provider
        text idempotency_key
        text status
        integer retry_count
        timestamptz next_retry_at
        text last_error
        jsonb raw_payload
        timestamptz created_at
        timestamptz updated_at
    }

    EXTERNAL_ISSUES {
        uuid id PK
        uuid feedback_id FK "unique"
        uuid issue_target_id FK
        text provider
        text external_id
        integer external_iid
        integer external_number
        text url
        text state
        jsonb raw_payload
        timestamptz created_at
        timestamptz updated_at
    }
```

`FEEDBACKS` est condensee ici: la table reelle contient aussi une vingtaine de colonnes `screenshot_*` / `browser_capture_*` (bytes, hash, storage_path, usage_count, archived_at, deleted_at...) ajoutees par la migration `0006_feedback_browser_capture_asset`. `MEMBERSHIPS.invited_by` est une seconde FK vers `USERS`, non dessinee comme relation separee pour ne pas surcharger le schema.

`PROJECT_ISSUE_MEMBERS.workspace_id` designe le workspace **proprietaire du projet partage**, pas celui du beneficiaire de l'acces: un utilisateur peut avoir une ligne ici pour un `workspace_id` different du sien s'il a recu un acces cible a des projets d'un autre workspace, sans en etre membre a part entiere.

## Frontend et BFF

Le navigateur doit continuer a parler au meme domaine applicatif:

- `https://changethis.cra.wallonie.be/widget.js`
- `https://changethis.cra.wallonie.be/api/public/feedback`
- `https://changethis.cra.wallonie.be/api/projects/...`

Cette contrainte evite de complexifier CORS cote navigateur. Next.js reste la couche publique/BFF et dialogue avec FastAPI via `INTERNAL_API_URL`.

## Donnees et securite

- La cle projet du widget est publique; l'origine HTTP reste validee cote API.
- Les tokens provider GitHub/GitLab ne doivent jamais entrer dans le navigateur.
- Les credentials provider sont chiffres applicativement et stockes cote backend.
- Les screenshots restent une dette connue: data URL aujourd'hui, stockage objet interne a brancher.
- `/api/ready` doit rester le check operationnel principal de l'app exposee.
- Les modes non supportes (`AUTH_MODE=ovh`, `DATA_STORE=postgres`) ne doivent plus etre documentes comme deployables.

## Deploiement interne

- `front-tool-prod` / `frontend.toolprod`: services `changethis-web.service` et `changethis-api.service`, Next.js sur `127.0.0.1:3000` et FastAPI sur `127.0.0.1:8000`.
- `back-tool-prod` / `back.toolprod`: PostgreSQL interne uniquement.
- Domaine utilisateur: `https://changethis.cra.wallonie.be`.
- Vhost frontal: reverse proxy vers Next.js.
- Secrets: `/etc/changethis/web.env` et `/etc/changethis/api.env`, lisibles uniquement par l'utilisateur applicatif.
