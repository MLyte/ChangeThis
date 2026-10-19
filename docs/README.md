# Documentation ChangeThis

Date de reference: 2026-05-21

La documentation active de `main` decrit l'installation interne CRA:

- domaine applicatif: `https://changethis.cra.wallonie.be`;
- frontend: Next.js `apps/web`;
- backend: FastAPI `apps/api`;
- base: PostgreSQL interne;
- deploiement: Ubuntu 24 natif avec `systemd`.

Les anciens documents d'experimentation SaaS ne doivent plus guider l'installation ou la production de cette branche.

## Source de verite

- [Etat actuel](current-state.fr.md): statut produit/technique court, a lire avant toute mise a jour generale.
- [Architecture](architecture.md): vue systeme interne, dataflow et contraintes de runtime.
- [CHANGE_LOG](../CHANGE_LOG.md): priorisation active, carnet de travail IA et journal des changements.

## Installation et exploitation interne

- [Installation interne Ubuntu 24](internal-ubuntu24-install.fr.md): runbook `systemd`, PostgreSQL, FastAPI et vhost interne.
- [Runbook production](production-runbook.md): checks, variables, smoke tests, rollback et signaux operationnels pour l'installation interne.
- [Checklist hardening](production-hardening-checklist.fr.md): dette securite/fiabilite priorisee avant usage production large.
- Sources infra PDF non versionnees actuellement presentes dans `docs/`:
  - `Création d'un utilisateur applicatif sur serveur frontend.pdf`
  - `VHOST config.pdf`
  - `MySQL DB_USER config.pdf`

## Produit et support client

- [Quick start client](quick-start-client.fr.md): premiere boucle site -> widget -> feedback -> issue.
- [Installer le widget](installer-widget-site.fr.md): snippet, origines autorisees, CSP et erreurs frequentes.
- [Configurer GitHub](configure-github.fr.md): connexion GitHub et permissions.

## Developpement local

- [Variables locales minimales](local-env-minimal.md): `.env.local` minimal et profil interne.
- [Page HTML de smoke widget](widget-external-smoke.html): page hote externe pour tester `/widget.js`.

## Archive historique

Les anciens guides d'experimentation SaaS ont ete retires de cette branche pour eviter de guider les prochains changements vers une architecture non active.
