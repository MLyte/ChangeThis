# Checklist hardening production — ChangeThis

Version: 2026-05-04  
Référence: `docs/current-state.fr.md`, `docs/production-runbook.md`, `docs/deploy-railway-ovh-changethis-dev.md`, `AI_TODO.md`

Ce document propose une check-list opérationnelle pour passer de la bêta ouverte contrôlée à un fonctionnement production robuste, en distinguant:
- **Quick wins (2–4 semaines)**: actions à faible surface, rapide à exécuter, peu de refacto.
- **Plus grand scope**: actions structurantes, plus coûteuses, à planifier par jalons.

## 0) Pré-conditions obligatoires

- [ ] `AUTH_MODE=supabase`
- [ ] `DATA_STORE=supabase`
- [ ] `/api/ready` vert en staging et en production sur une vérification manuelle.
- [ ] `npm run prod:check` vert avant chaque release candidate.
- [ ] `supabase/migrations/0001` à `0008` applicées et vérifiées.

## 1) Sécurité

### Quick wins (2 semaines)
- [ ] Geler le périmètre d’origines (`allowedOrigins`) côté API publique, sans fallback permissif.
- [ ] Ajouter des limites de tailles/length sur tous les champs texte des routes:
  - `/api/public/feedback`
  - routes privées Dashboard (`/api/projects/*`)
- [ ] Vérifier et normaliser la validation HTTP (405 explicite) sur toutes les routes API.
- [ ] Réduire les informations d’erreur exposées au client; messages génériques avec `error_code`.
- [ ] Ajouter redaction systématique des secrets/PII dans les logs.
- [ ] Ajouter une revue CI `secrets scan` (git + historique) sur chaque PR.
- [ ] Bloquer `NEXT_PUBLIC_` pour clés sensibles ou valeurs non prévues en front (revue de `env:check`).
- [ ] Finaliser audit RLS minimum (lecture/écriture) selon les rôles `owner/admin/member/viewer`.

### Plus grand scope
- [ ] Introduire coffre KMS/Vault pour les credentials provider (même si chiffrement applicatif existant en place, migrer vers un secret store géré).
- [ ] Mettre en place rotation documentée + alerting sur ancienneté des secrets (`CHANGETHIS_SECRET_KEY`, secrets provider).
- [ ] Ajouter webhook signature verification robuste pour GitHub/GitLab + rejets stockés (idempotence, replay protection).
- [ ] Ajouter politique de scan/quarantaine anti-malware pour les assets si captures stockées hors data URL.
- [ ] Documenter un standard de conformité (chiffrement repos/transport, DPA/RGPD, conservation TTL).

## 2) Observabilité

### Quick wins (2–3 semaines)
- [ ] Unifier un schéma de logs JSON dans toutes les fonctions API critiques:
  - `request_id`, `workspace_id`, `project_id`, `feedback_id`, `provider`.
- [ ] Propager `request_id` du front (`widget`) jusqu’à l’événement d’issue externe.
- [ ] Ajouter métriques de base (au minimum 5 compteurs + 5 latences):
  - `feedback_received`, `feedback_rejected`, `issue_create_ok`, `issue_create_retry`, `provider_error`.
  - p50/p95 de latence sur endpoints clés.
- [ ] Ajouter un `dashboard opérationnel minimal` avec 24h/7d:
  - taux 5xx, taux rejet, backlog retries.
- [ ] Alertes minimum:
  - 5xx API > seuil
  - provider error burst
  - feedback bloqués en `retrying` > seuil temporal.
- [ ] Ajouter corrélation d’erreurs runbook-friendly dans `/projects` (trace d’un feedback).

### Plus grand scope
- [ ] Introduire tracing distribué (Next.js compatible OpenTelemetry) + span provider call.
- [ ] Alertes prédictives/SLO:
  - budget d’erreur par route
  - latence p95 > SLO pour `/api/public/feedback`
  - taux d’échec de création d’issue par provider.
- [ ] Export métriques vers service externe (Datadog/NewRelic/Self-hosted Prometheus + Grafana selon stack choisie).
- [ ] Cartes de monitoring incidents (Runbook links + escalation paths intégrées dans l’UI d’alerte).

## 3) Jobs / Fiabilité pipeline feedback → issue

### Quick wins (3 semaines)
- [ ] Reproduire et verrouiller la table d’état de retry (`retrying/failed/sent_to_provider`).
- [ ] Backoff + jitter configurable + plafond de retries.
- [ ] Ajout d’un verrou applicatif anti-double exécution par `feedback_id`.
- [ ] Limiter les doublons widget (idempotence côté réception feedback + key courte).
- [ ] Route d’action `retry` + vue `failed` dans `/projects`.
- [ ] Circuit breaker simple par provider + compteur d’échec.
- [ ] Test de charge léger sur `/api/public/feedback` + CORS autorisées.

### Plus grand scope
- [ ] File durable (BullMQ/Cloud task/queue managée) au lieu de retry purement applicatif.
- [ ] Worker séparé du web (plusieurs réplicas possibles) avec DLQ et rétention.
- [ ] Gestion d’expiration des tentatives + statut terminal explicite (`permanent_failure`).
- [ ] Dead-letter review + replay batché par lot (sans risque d’inondation provider).

## 4) Déploiement

### Quick wins (1 semaine)
- [ ] Stabiliser un déploiement par environnement (`local`/`staging`/`prod`) avec vars séparées.
- [ ] Ajouter checks de pré-déploiement:
  - migrations, lint, typecheck, `prod:check`, smoke script.
- [ ] Versionner le manifeste de secrets attendus (`.env.example` vs `.env.production.example`).
- [ ] Verrouiller un workflow de release simple:
  - tag -> pré-release staging -> validation smoke -> production.
- [ ] Définir `rollback` applicatif court:
  - reprise de commit antérieur + migration DB non destructive uniquement.

### Plus grand scope
- [ ] Blue/Green ou canary sur Railway (ou migration vers orchestrateur plus fin si besoin).
- [ ] Script de vérification post-déploiement automatisé:
  - `/api/health`, `/api/ready`, login, smoke widget->feedback, création d’issue en pilotage.
- [ ] Plan d’exécution pour rollback migration (forward-only + script de repli).
- [ ] Chaos validation trimestrielle (redémarrage, latence Supabase, timeout provider).

## 5) Runbooks

### Quick wins (1–2 semaines)
- [ ] Créer runbooks minimum 6 incidents:
  - `feedback API 5xx`
  - `rate limit / spam`
  - `OAuth/token callback invalide`
  - `provider rate-limited`
  - `feedback bloqués en retrying`
  - `backup/restore nécessaire`
- [ ] Ajouter playbook "secret compromis" (rotation immédiate + impact + communication).
- [ ] Ajouter modèles de réponse support:
  - bug widget client
  - connexion GitHub/GitLab/issue target.

### Plus grand scope
- [ ] Intégrer runbooks au système d’alerte (lien direct + escalation).
- [ ] Post-mortem template (timeline, RCA, actions, owner).
- [ ] Revue mensuelle des incidents + dette de fiabilité.

## 6) Gestion des erreurs (support + DX produit)

### Quick wins (2 semaines)
- [ ] Standardiser le format d’erreur API:
  - `code`, `message_user`, `message_internal`, `retryable`, `request_id`.
- [ ] Ajouter un centre d’aide intégré (diagnostic par feedback id, contexte projet, provider, last event).
- [ ] Remonter les erreurs actionnables dans l’UI:
  - OAuth invalide
  - origine refusée
  - token manquant/expiré
  - quota / rate limit
- [ ] Export CSV des erreurs / feedback bloqués pour support.

### Plus grand scope
- [ ] Système de ticketing interne automatique sur erreur critique.
- [ ] Notification contextualisée (Slack/Email) avec playbook lié.
- [ ] Taxonomie d’erreurs partagée dashboard produit + support.

## 7) Roadmap incrémentale réaliste

### Phase 1 — Base solide (Semaines 1-4)
- Sécurité minimale: CORS + validations + redaction + secret scan.
- Observabilité minimale: logs JSON + request_id + alertes 5xx/retrying.
- Jobs: retries configurable + vue failed + verrous anti-double issue.
- Deploy: pipeline release avec gates `prod:check` + smoke.
- Runbooks: 6 procédures + modèle support.

### Phase 2 — Résilience (Semaines 5-8)
- Idempotence renforcée + circuit breaker + tests de chaos de base.
- Monitoring enrichi, SLOs de feedback/p99, alertes provider.
- Stabilisation du rollback prod et scripts de vérification.
- Documentation erreurs: format standard + écran diagnostic.

### Phase 3 — Scale/Hardening avancé (Semaines 9-16)
- File durable + worker séparé + DLQ.
- Tracing distribué + observabilité complète.
- RLS tests complets + secret management avancé.
- Plan d’incident mature (post-mortems, escalation, KPI MTTR).
- Sécurisation/rotation avancée des credentials provider.

### Gate Go/No-Go final
- 30 jours sans perte de feedback.
- >99% des feedbacks passent de `received` à `sent_to_provider` (ou status terminal) sans intervention manuelle.
- Aucune alerte critique non justifiée > 3 par semaine.
- Runbook testé en exercice (simulation d’incident) au moins 1 fois/mois.
- `rollback + redeploy` reproductibles en <30 minutes.

## 8) Prochaine action recommandée (prochaine itération)

- [ ] Lancer la **Phase 1**, lot 1:
  - CORS strict
  - request_id uniforme
  - format d’erreur standard
  - vue `failed` + retry manuel
  - runbook *feedback API 5xx* + *provider rate limited*.
