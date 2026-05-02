# Feuille de route de préparation commerciale

Etat actuel: voir [current-state.fr.md](current-state.fr.md).

Ce document décrit les blocs restants pour passer de la beta privée préparée
sur Railway + Supabase Auth/DB à une version SaaS commercialisable.

## 1) Produits et marché

- **Offre produit clairement positionnée**
  - Public cible priorisé (freelance, agence, équipe produit)
  - ICP et critères de succès de premier achat
  - Proposition de valeur : de la réception de feedback au suivi d’issue
- **Activation de la vente**
  - Page pricing minimale (plans, limites, trial)
  - Page “Démarrage rapide” client
  - Processus d’onboarding du premier feedback réel

## 2) Architecture technique tenant-safe

- **Auth et sessions**
  - Session Supabase obligatoire en production
  - Isolation systématique par `workspaceId` sur routes dashboard/API
  - Contrôles d’accès par rôle (`viewer`, `member`, `admin`, `owner`)
- **Données et persistance**
  - `DATA_STORE=supabase` disponible pour feedbacks, événements, sites, destinations, providers et credentials chiffrés
  - `DATA_STORE=file` réservé au local et interdit en production beta
  - Gestion complète des migrations, seeds de dev, backup/restore
- **Widget**
  - Distribution stable par `/widget.js` et `/widget.global.js`
  - Vérification de compatibilité et fallback si bundle indisponible
  - Mesure de performance d’initialisation et de capture

## 3) Intégrations et exécution métier

- **Issue providers**
  - Gestion robuste GitHub/GitLab (installation, tokens, reconnect, pagination)
  - Mapping explicite workspace ↔ intégration ↔ destination d’issue
  - Processus asynchrone fiable (`retry`, verrous, idempotence)
- **Feedbacks**
  - Pipeline `feedback -> issue` auditable
  - États réels de statut et replays sécurisés
  - Export/suppression client des données workspace

## 4) Fiabilité, sécurité et conformité

- **Résilience opérationnelle**
  - `/api/health`, `/api/ready`, `env:check`, `migrations:check` et `prod:check` existent; métriques critiques et alertes restent à brancher
  - Jobs robustes, dead-letter/backoff, alertes
- **Sécurité**
  - Headers web, CSP, CSRF et validation d'origine déjà amorcés; limite body/rate limit partagé restent à durcir
  - Credentials provider chiffrés applicativement; coffre/KMS et rotation restent à faire
  - Scans d’audit et revue logs (redaction de secrets)
- **Conformité**
  - Processus de retention et purge
  - Politique de confidentialité produit et transparence des données capturées
  - Export / suppression workspace au format support client

## 5) Support, opérations, observabilité

- **Runbooks**
  - Incidents critiques prévus et procédures de rollback
- **Support**
- Onboarding support : guide widget, connexions Git, résolution d’erreur
  - Canal support documenté avec contact et SLA minimale
- **Monitoring**
  - Logs structurés avec `request_id`
  - Panneaux opérationnels staging/production
  - Monitoring des erreurs, retry backlog, expiration credentials

## 6) Commercialisation

- **Monétisation**
  - Définition des quotas par plan
  - Trial visible et logique d’upgrade/downgrade
  - Intégration de paiement + portail client
- **Go/No-Go**
  - Vérification de chaque bloc P0 avant lancement
  - Contrôle final par décision produit/commerciale documentée

## Priorité d’exécution recommandée

- **P0 (pré-lancement)** : smoke Supabase réel, `DATA_STORE=supabase`, sécurité API publique, screenshots hors data URL, onboarding 1er site, issue manuelle fiable.
- **P1** : billing minimal, observabilité API, runbooks, conformité opérationnelle, documentation client essentielle.
- **P2** : optimisations UI/UX avancées, rapports, tests de charge, extensions multicanaux de support.
