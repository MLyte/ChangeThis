# Plan vers une version production "100% fonctionnelle"

Ce plan traduit l'état actuel du projet en une trajectoire exécutable vers une mise en production robuste.

## 1) Définir "100% fonctionnelle" avec des critères mesurables

Ne pas lancer avec un critère vague. Utiliser un Go/No-Go basé sur des SLO/SLI :

- **Disponibilité API feedback**: p95 < 400 ms, taux d'erreur < 1%.
- **Durabilité des feedbacks**: 0 perte de données après redémarrage.
- **Création d'issues externes**: taux de succès > 99% avec retries.
- **Sécurité**: origines autorisées strictes, secrets gérés en env, journalisation d'audit.
- **Observabilité**: logs structurés, métriques et alertes exploitables.

## 2) Priorité absolue: persistance durable

Le projet indique déjà que la principale limite actuelle est le stockage en mémoire de la session Next.js.

Livrables :

1. Implémenter un repository persistant (Supabase/Postgres) pour les feedbacks.
2. Garder `/projects` branché sur l'abstraction repository (pas sur des mocks).
3. Ajouter un cycle de statut explicite (`raw`, `sent_to_provider`, `failed`).
4. Créer une stratégie de migration et rollback SQL versionnée.

Definition of Done :

- Un redémarrage du serveur **ne supprime pas** les feedbacks.
- Les feedbacks sont historisés et filtrables par statut/projet/date.

## 3) Fiabiliser l'intégration providers (GitHub/GitLab)

Commencer par un flux manuel, puis automatiser.

Livrables :

1. Bouton manuel "Create issue" dans l'inbox (`/projects`).
2. Implémenter l'idempotency key côté création provider.
3. Gérer retries exponentiels et file de reprise (`failed -> retrying -> sent_to_provider`).
4. Journal d'erreurs exploitable (raison provider, payload de contexte, horodatage).

Definition of Done :

- Une erreur provider est visible, traçable et rejouable sans doublon.
- Les créations d'issues sont auditables de bout en bout.

## 4) Captures d'écran et pièces jointes durables

Les screenshots sont acceptés mais pas durables dans l'état actuel.

Livrables :

1. Stockage objet (bucket) avec URL signées.
2. Politique de taille/type MIME et antivirus si nécessaire.
3. Liaison feedback ↔ asset dans la base.
4. Suppression/TTL conforme à la politique RGPD.

Definition of Done :

- Les captures sont disponibles après redémarrage et attachables aux issues.

## 5) Sécurité production

Checklist minimale avant ouverture :

- Validation stricte des payloads API publiques.
- CORS verrouillé sur `allowedOrigins` par projet.
- Rotation de secrets + environnements séparés (dev/staging/prod).
- Rate limiting + anti-spam sur endpoint public.
- Politique de permissions minimale sur DB/bucket/tokens providers.

## 6) Observabilité et exploitation

Sans observabilité, pas de production fiable.

Livrables :

- Logs JSON corrélés (`request_id`, `project_id`, `feedback_id`).
- Traces et métriques: latence API, taux de refus validation, taux d'échec provider, délais de retry.
- Alertes: pic erreurs 5xx, échecs provider continus, temps de traitement anormal.
- Dashboard opérationnel (runbook + owner d'astreinte).

## 7) Qualité logicielle et tests de non-régression

Gates CI recommandés :

1. `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.
2. Tests d'intégration API (`/api/public/feedback`, `/api/widget/config`).
3. Tests E2E widget -> API -> inbox (`/demo` vers `/projects`).
4. Tests de chaos simples: redémarrage service, indisponibilité provider, timeout DB.

## 8) Plan de release par étapes

### Étape A (1-2 semaines)
- Persistance DB + statuts + historique.

### Étape B (1-2 semaines)
- Flux manuel "Create issue" + idempotence + retries.

### Étape C (1 semaine)
- Screenshots durables + rattachement issue.

### Étape D (1 semaine)
- Hardening sécurité + monitoring + alerting + runbook.

### Étape E (quelques jours)
- Dry-run en staging avec vrais clients pilotes (10 feedbacks réels minimum).

## 9) KPI de validation "production prête"

- 0 perte de feedback sur 30 jours.
- >99% des feedbacks passent de `raw` à `sent_to_provider` en < 5 min.
- Temps médian de triage réduit d'au moins 30% côté développeur.
- MTTR incident < 30 min sur les incidents fréquents.

## 10) Prochaine action immédiate (ordre conseillé)

1. Brancher le repository Supabase/Postgres.
2. Ajouter la colonne de statut et l'historique d'état.
3. Exposer dans l'inbox une action manuelle de création d'issue.
4. Ajouter retries/idempotence et logs structurés.
5. Lancer un pilote staging avec un client réel.

---

En pratique: tant que la persistance, l'idempotence provider et l'observabilité ne sont pas en place, la version n'est pas réellement "production". Ce sont les trois chantiers critiques à fermer en premier.
