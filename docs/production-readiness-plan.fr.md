# Plan vers une version production "100% fonctionnelle"

Etat actuel: voir [current-state.fr.md](current-state.fr.md).

Ce plan traduit l'état actuel du projet en une trajectoire exécutable vers une mise en production robuste.

## 1) Définir "100% fonctionnelle" avec des critères mesurables

Ne pas lancer avec un critère vague. Utiliser un Go/No-Go basé sur des SLO/SLI :

- **Disponibilité API feedback**: p95 < 400 ms, taux d'erreur < 1%.
- **Durabilité des feedbacks**: 0 perte de données après redémarrage.
- **Création d'issues externes**: taux de succès > 99% avec retries.
- **Sécurité**: origines autorisées strictes, secrets gérés en env, journalisation d'audit.
- **Observabilité**: logs structurés, métriques et alertes exploitables.

## 1.1) Checklist Go/No-Go commerciale (décision de lancement)

Le projet peut passer en commercial uniquement si **tous** les critères ci-dessous sont validés.  
En cas d'un seul critère non tenu, la décision est **No-Go**.

- [ ] **Go bloquant** — Le flux `widget -> inbox -> issue` fonctionne en conditions réelles (site réel, origine autorisée, destination externe configurée).
- [ ] **Go bloquant** — Persistance production active par workspace avec `DATA_STORE=supabase`, migrations `0001` à `0007` appliquées, rollback documenté.
- [ ] **Go bloquant** — Contrôle d'accès workspace/ rôle (`viewer` limité, `admin/owner` pour actions critiques) vérifié sur toutes les routes dashboard et API critiques.
- [ ] **Go bloquant** — Sécurité d'entrée/sortie : CORS + CSRF + validation stricte, secrets minimum exposés, logs sensibles masqués.
- [ ] **Go bloquant** — Observabilité minimale opérationnelle : `/health`, `/ready`, alertes 5xx et backlog retries, métriques feedback/providers.
- [ ] **Go bloquant** — Capacité de support au lancement : runbook incident, contact support disponible, export et suppression de données supportés.
- [ ] **Go bloquant** — Coûts et limites plan produit définis (prix, trial, quotas, blocage explicite des dépassements).
- [ ] **Go bloquant** — Documentation commerciale et onboarding client publiées (Démarrage rapide, installation widget, FAQ commerciale de base).

## 1.2) Matrice d'évolution vers le commercialisable

| Domaine | Prototype | Beta | Commercialisable |
| --- | --- | --- | --- |
| **Auth** | Auth locale dev. | Supabase Auth obligatoire pour la beta prod, signup public fermé. | Auth/IdP stable, sessions sécurisées, rôles `viewer`/`member`/`admin`/`owner` et scope workspace systématique. |
| **Données** | Fichier local pour dev. | `DATA_STORE=supabase` pour sites, feedbacks, statuts, intégrations et credentials; smoke réel à valider. | Stockage production complet + migrations, backup/restore, rollback documentés. |
| **Widget** | Démo locale. | Widget public servi par `/widget.js` + `/widget.global.js`, script d'installation et checks de base. | Widget versionné, compatibilité navigateur, performance budgétée, fallback documenté. |
| **Intégrations** | Tokens/env locaux. | GitHub/GitLab workspace-backed partiels, création manuelle d'issue depuis l'inbox. | Flux GitHub/GitLab complets (installation/token, refresh, webhooks, rotation, pagination), relances + idempotence + sécurisation provider. |
| **Support** | Docs minimales. | `/api/health`, `/api/ready`, guides client et Go base réelle. | Runbooks opérationnels, monitoring, alerte 5xx/backlog retries, FAQ/support produit, export et suppression data client. |
| **Billing** | Aucun modèle commercial opérationnel. | Positionnement et pricing documentés. | Plans et limites définis, trial actif/expiré, règles de blocage explicites et UX de statut billing visible dans le produit. |

## 2) Priorité absolue: persistance durable

La principale limite n'est plus le store local pur: le mode Supabase existe. La prochaine validation consiste à appliquer les migrations sur une vraie instance, exécuter le smoke `widget -> inbox`, puis fermer les risques de stockage screenshot/rate limit/retry.

Livrables :

1. Valider `DATA_STORE=supabase` sur staging/prod.
2. Garder `/projects` branché sur l'abstraction repository.
3. Ajouter les index dashboard/retry manquants.
4. Créer une stratégie de backup/restore et rollback SQL versionnée.

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

Les screenshots sont persistés transitoirement en DB sous forme de data URL. C'est durable mais pas acceptable commercialement à volume réel.

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
2. `npm run security:audit` comme gate non destructif; toute vulnérabilité `high` ou `critical` doit bloquer la release ou être documentée avec package, CVE, impact et plan de correction.
3. Tests d'intégration API (`/api/public/feedback`, `/api/widget/config`).
4. Tests E2E widget -> API -> inbox (`/demo` vers `/projects`).
5. Tests de chaos simples: redémarrage service, indisponibilité provider, timeout DB.

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

1. Appliquer les migrations Supabase sur staging et valider `npm run prod:check`.
2. Faire un smoke réel `widget -> inbox -> issue`.
3. Déplacer les screenshots vers stockage objet ou désactiver la capture en beta.
4. Ajouter rate limit partagé, idempotence/verrou provider et logs structurés.
5. Lancer un pilote staging avec un client réel.

---

En pratique: tant que la persistance, l'idempotence provider et l'observabilité ne sont pas en place, la version n'est pas réellement "production". Ce sont les trois chantiers critiques à fermer en premier.
