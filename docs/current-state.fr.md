# Etat actuel ChangeThis

Date de reference: 2026-05-21

Ce document est la source courte a consulter avant de modifier une documentation generale, une checklist de production ou une decision d'architecture.

## Synthese

La branche `main` documente maintenant une cible unique: l'installation interne CRA de ChangeThis.

- Domaine applicatif: `https://changethis.cra.wallonie.be`.
- Frontend: Next.js `apps/web`, service `changethis-web.service`.
- Backend applicatif: FastAPI `apps/api`, service `changethis-api.service`, sur le meme serveur que le front (`front-tool-prod` / `frontend.toolprod`).
- Store: PostgreSQL interne via SQLAlchemy/Alembic, seul composant attendu sur `back-tool-prod` / `back.toolprod`.
- Runtime attendu: `AUTH_MODE=internal`, `DATA_STORE=internal`, `INTERNAL_API_URL=http://127.0.0.1:8000`.
- Deploiement: Ubuntu 24 natif avec scripts `scripts/internal/*` et services `systemd`.

Les anciens documents d'experimentation SaaS ne correspondent pas a l'installation interne active.

## Produit

- ChangeThis collecte des retours visuels depuis un widget embarque sur des sites en conception, developpement ou recette.
- La boucle produit active est: site connecte -> widget public -> feedback -> inbox `/projects` -> creation manuelle d'issue GitHub/GitLab.
- Le mode automatique de creation d'issue existe par site, mais ne doit pas etre promu avant renforcement idempotence/retry/verrou.
- Le widget peut demander l'identite visiteur par site (`hidden`, `optional`, `required`) et remonte `reporter.name` / `reporter.email`.
- La page `/demo` reste un bac a sable widget, pas une preuve d'installation client.

## Stack interne

- App web: Next.js App Router dans `apps/web`.
- Widget public: `packages/widget`, servi par `/widget.js` et `/widget.global.js`.
- Types/protocole partages: `packages/shared`.
- Backend API: FastAPI dans `apps/api`.
- Base: PostgreSQL interne sur `back-tool-prod` / `back.toolprod`, role applicatif limite `changethis`.
- Migrations backend: Alembic, schema initial dans `apps/api/alembic/versions/0001_internal_schema.py`.
- Proxy frontal: vhost `changethis.cra.wallonie.be` vers Next.js.
- Communication serveur: Next.js appelle FastAPI localement via `INTERNAL_API_URL=http://127.0.0.1:8000`.

## Garde-fous

- `npm run env:check` valide les variables critiques, dont le profil `internal`.
- `/api/health` repond minimalement et sans cache.
- `/api/ready` doit verifier la disponibilite FastAPI quand `AUTH_MODE=internal` ou `DATA_STORE=internal`.
- `alembic upgrade head` doit etre execute sur le backend avant un deploy complet.
- `systemctl status changethis-web changethis-api` doit etre vert sur `front-tool-prod`.
- `AUTH_MODE=local` et `DATA_STORE=file` sont reserves au developpement local.
- `AUTH_MODE=ovh` et `DATA_STORE=postgres` ne sont pas des modes supportes.

## Donnees deja modelisees

- Utilisateurs, workspaces, membres et roles.
- Sites/projets connectes et cles publiques actives.
- Feedbacks, statuts, evenements, tentatives provider et issues externes.
- Integrations GitHub/GitLab par workspace.
- Credentials provider chiffres applicativement.
- Destinations d'issues par site.

## Limites connues avant production large

- Les repositories Next.js existants doivent encore migrer progressivement vers le client serveur FastAPI interne.
- Les screenshots sont compresses cote widget avant envoi, mais restent stockes transitoirement en data URL; un stockage objet interne reste a brancher.
- Le rate limit public reste memoire et doit passer sur un store partage si plusieurs instances servent l'API.
- L'idempotence provider et les verrous anti double issue doivent etre renforces.
- Les retries ne remplacent pas encore une queue durable.
- Backup/restore PostgreSQL et rollback Alembic doivent etre testes sur un environnement de validation.

## Licences

- Licence repo et packages internes: European Union Public Licence 1.2 (`EUPL-1.2`).
- Les dependances tierces restent sous leurs propres licences.
