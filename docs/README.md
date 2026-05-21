# Documentation ChangeThis

Date de reference: 2026-05-21

La documentation est organisee autour de deux chemins distincts:

- **Beta SaaS actuelle**: Railway + Supabase Auth/DB + OVH DNS pour `https://app.changethis.dev`.
- **Installation interne Ubuntu 24**: Next.js + FastAPI + PostgreSQL interne pour `https://changethis.toolprod`.

Ne pas melanger les variables de ces deux chemins dans un meme environnement.

## Source de verite

- [Etat actuel](current-state.fr.md): statut produit/technique court, a lire avant toute mise a jour generale.
- [Architecture](architecture.md): vue systeme et profils de runtime.
- [AI_TODO](../AI_TODO.md): priorisation active et carnet de travail IA.

## Exploitation beta SaaS

- [Runbook production](production-runbook.md): gates, variables, signaux et rollback pour la beta SaaS.
- [Deploy Railway + Supabase + OVH](deploy-railway-ovh-changethis-dev.md): guide operateur detaille pour `app.changethis.dev`.
- [Guide debutant beta](guide-debutant-prod-railway-supabase-ovh.fr.md): version pas-a-pas du deploy beta.
- [Smoke beta controlee](smoke-beta-controlee.fr.md): checklist post-deploy et test widget externe.
- [Roadmap beta](beta-release-roadmap.fr.md): jalons de stabilisation.
- [Checklist hardening](production-hardening-checklist.fr.md): dette priorisee avant production commerciale.

## Installation interne

- [Installation interne Ubuntu 24](internal-ubuntu24-install.fr.md): runbook `systemd`, PostgreSQL, FastAPI et vhost interne.
- Sources infra PDF non versionnees actuellement presentes dans `docs/`:
  - `Création d'un utilisateur applicatif sur serveur frontend.pdf`
  - `VHOST config.pdf`
  - `MySQL DB_USER config.pdf`

## Produit et support client

- [Quick start client](quick-start-client.fr.md): premiere boucle site -> widget -> feedback -> issue.
- [Installer le widget](installer-widget-site.fr.md): snippet, origines autorisees, CSP et erreurs frequentes.
- [Configurer GitHub](configure-github.fr.md): connexion GitHub et permissions.
- [Template e-mail Supabase Auth](supabase-auth-email-template.fr.md): OTP e-mail pour le chemin Supabase.

## Developpement local

- [Variables locales minimales](local-env-minimal.md): `.env.local` minimal et modes supportes.
- [Page HTML de smoke widget](widget-external-smoke.html): page hote externe pour tester `/widget.js`.

## Decisions

- [ADR Supabase Auth foundations](adr-supabase-auth-foundations.md): decision acceptee pour la beta SaaS actuelle.

## Archive

- [OVH zero-to-prod guide](archive/ovh-zero-to-prod-guide.md): ancien guide cible OVH native. Archive conservee pour contexte, mais ne decrit plus un chemin implemente.
