# AI_TODO.md

## Règle d'exécution IA
- Traiter uniquement la première tâche non cochée de ce fichier.
- Faire un changement minimal, vérifiable et réversible.
- Exécuter le check pertinent après chaque changement.
- Cocher la tâche terminée et ajouter une note courte dans la section "Journal".
- S'arrêter avant la section "Intervention utilisateur requise" si une tâche dépend d'une décision, d'un accès, d'un secret, d'un compte ou d'une validation humaine.

- [x] Créer le script de lancement Windows `start-service.bat` pour NSSM.
## 1. Socle commercialisable immédiat
- [x] Créer un document `docs/commercial-readiness-map.md` qui décrit les blocs manquants pour passer du prototype local au SaaS vendable.
- [x] Ajouter une checklist Go/No-Go commerciale dans `docs/production-readiness-plan.fr.md`.
- [x] Ajouter une matrice "prototype / beta / commercialisable" pour auth, données, widget, intégrations, support et billing.
- [x] Vérifier que `README.md` explique clairement le produit, le public cible et le flux `widget -> inbox -> issue`.
- [x] Mettre à jour `docs/local-env-minimal.md` avec les variables réellement nécessaires aujourd'hui.
- [x] Ajouter un fichier `.env.production.example` sans secrets avec toutes les variables de production attendues.
- [x] Ajouter un script de validation env qui échoue si `AUTH_MODE`, `DATA_STORE`, `NEXT_PUBLIC_APP_URL` ou les secrets requis manquent.
- [x] Ajouter une garde qui refuse `AUTH_MODE=local` en production.
- [x] Ajouter une garde qui refuse `DATA_STORE=file` en production.
- [x] Ajouter une garde qui refuse les project keys de fallback en production.

## 2. Auth, workspaces et rôles
- [x] Implémenter le login Supabase réel sur `/login` avec email/password ou magic link.
- [x] Créer une route callback/session Supabase qui pose un cookie serveur sécurisé.
- [x] Remplacer la session locale par une session Supabase obligatoire en production.
- [x] Lier chaque requête dashboard à un `workspaceId` issu de la session.
- [ ] Filtrer toutes les lectures de feedbacks par workspace.
- [ ] Filtrer toutes les lectures de projets/sites par workspace.
- [ ] Filtrer toutes les intégrations provider par workspace.
- [ ] Appliquer les rôles `viewer`, `member`, `admin` et `owner` sur chaque route API privée.
- [ ] Restreindre la modification des destinations d'issues aux rôles `admin` et `owner`.
- [ ] Restreindre les relances de retries aux rôles `admin` et `owner`.
- [ ] Ajouter un flux d'onboarding qui crée l'organisation, le workspace, l'owner et le premier site.
- [ ] Ajouter une page de gestion des membres du workspace.
- [ ] Ajouter une invitation membre avec statut `invited`.
- [ ] Ajouter une désactivation membre avec statut `disabled`.
- [ ] Ajouter un sélecteur de workspace si un utilisateur appartient à plusieurs organisations.

## 3. Onboarding produit
- [ ] Définir le parcours premier utilisateur de `signup/login` jusqu'au premier feedback reçu.
- [ ] Créer une checklist onboarding affichée dans l'app avec étapes compte Git, site, script, feedback test et issue créée.
- [ ] Ajouter un état vide guidé pour `/projects` quand aucun site réel n'est configuré.
- [ ] Ajouter un état vide guidé pour `/settings/connected-sites` quand aucun site n'existe.
- [ ] Ajouter une action "Créer un site" avec nom, domaine autorisé et clé publique générée.
- [ ] Ajouter une validation visible des origines autorisées avant de fournir le script widget.
- [ ] Ajouter un test de feedback depuis un site configuré, distinct de la page `/demo`.
- [ ] Ajouter une confirmation de fin d'onboarding quand un feedback réel crée une issue externe.
- [ ] Ajouter une vue "inviter un développeur ou collègue" pour les usages agence et équipe.

## 4. Données et stockage production
- [ ] Implémenter un repository Supabase/Postgres pour les feedbacks.
- [ ] Implémenter un repository Supabase/Postgres pour les événements de statut.
- [ ] Implémenter un repository Supabase/Postgres pour les projets/sites.
- [ ] Implémenter un repository Supabase/Postgres pour les destinations d'issues.
- [ ] Implémenter un repository Supabase/Postgres pour les intégrations provider.
- [ ] Ajouter un switch `DATA_STORE=supabase` qui utilise uniquement Postgres en production.
- [ ] Lire les project public keys actifs depuis la base plutôt que depuis des constantes locales.
- [ ] Supprimer la dépendance production aux projets codés en dur dans `demo-project.ts`.
- [ ] Ajouter une rotation des project public keys via `project_public_keys`.
- [ ] Migrer les screenshots depuis les data URLs vers Supabase Storage ou stockage objet.
- [ ] Stocker uniquement un chemin d'objet ou une URL signée pour chaque screenshot.
- [ ] Ajouter une table ou colonne pour le hash de contenu des screenshots.
- [ ] Ajouter une migration pour les index nécessaires aux listes feedbacks par projet, statut et date.
- [ ] Ajouter une migration pour les timestamps `updated_at` automatiques.
- [ ] Ajouter une migration pour conserver le raw payload provider des créations d'issues.
- [ ] Ajouter un script de seed local non sensible pour créer un workspace et un site de démo.
- [ ] Ajouter un script de migration du store fichier local vers Supabase.
- [ ] Ajouter une commande de vérification d'intégrité des feedbacks, assets et issue targets.
- [ ] Ajouter une procédure de backup Supabase avec fréquence, rétention et owner.
- [ ] Ajouter une procédure de restore Supabase testée sur environnement isolé.
- [ ] Ajouter une procédure d'export client des feedbacks d'un workspace.
- [ ] Ajouter une procédure de suppression définitive workspace/projet/feedback.

## 5. Widget commercial
- [ ] Ajouter une version publique du widget dans le bundle servi.
- [ ] Ajouter des cache headers versionnés pour `/widget.js` et `/widget.global.js`.
- [ ] Ajouter une option widget pour désactiver la capture screenshot par site.
- [ ] Ajouter une vérification de compatibilité navigateur du widget.
- [ ] Ajouter un fallback UX si le bundle widget n'est pas construit.
- [ ] Ajouter des tests unitaires widget pour `inferEndpoint` depuis `data-endpoint`, `script.src` et fallback.
- [ ] Ajouter des tests unitaires widget pour `inferLocale` depuis attribut, localStorage et langue document.
- [ ] Ajouter des tests widget pour le rendu Shadow DOM sans collision avec CSS hôte.
- [ ] Ajouter des tests widget pour ouverture/fermeture sans doublonner `changethis-widget-root`.
- [ ] Ajouter des tests widget pour échappement HTML des labels, messages et métadonnées.
- [ ] Ajouter des tests widget pour masquage temporaire des champs sensibles pendant capture.
- [ ] Ajouter des tests widget pour restauration des champs sensibles après échec de capture.
- [ ] Ajouter des tests widget pour sélection de zone minimale ignorée.
- [ ] Ajouter des tests widget pour repositionnement du pin après scroll et resize.
- [ ] Ajouter un smoke test du bundle `/widget.js` et `/widget.global.js` dans une page HTML externe.
- [ ] Définir un budget de taille pour `packages/widget/dist/widget.global.js`.
- [ ] Ajouter un check CI qui échoue si le bundle widget dépasse le budget validé.
- [ ] Mesurer le coût d'initialisation du widget sur page externe.
- [ ] Mesurer le temps de capture screenshot p50/p95 sur desktop et mobile.

## 6. Intégrations GitHub/GitLab
- [ ] Finaliser le flux GitHub App installation avec récupération et stockage de l'installation par workspace.
- [ ] Finaliser la création de token GitHub installation par intégration workspace.
- [ ] Associer chaque issue target GitHub à une intégration provider explicite.
- [ ] Valider que le repository sélectionné appartient à l'intégration GitHub connectée.
- [ ] Finaliser le refresh token GitLab OAuth.
- [ ] Associer chaque issue target GitLab à une intégration provider explicite.
- [ ] Valider que le projet GitLab sélectionné appartient à l'intégration GitLab connectée.
- [ ] Ajouter la déconnexion d'un compte GitHub.
- [ ] Ajouter la déconnexion d'un compte GitLab.
- [ ] Ajouter la reconnexion d'un provider en statut `needs_reconnect`.
- [ ] Ajouter une vérification périodique de validité des credentials provider.
- [ ] Ajouter la pagination complète des repositories GitHub au-delà de 100 résultats.
- [ ] Ajouter la pagination complète des projets GitLab au-delà de 100 résultats.
- [ ] Ajouter la recherche serveur des repositories providers.
- [ ] Ajouter une gestion explicite des permissions manquantes sur labels/issues.
- [ ] Ajouter une création optionnelle des labels manquants côté provider.
- [ ] Ajouter un fallback d'idempotence applicatif quand le provider ignore `Idempotency-Key`.
- [ ] Ajouter le support d'attachement ou lien sécurisé de screenshot dans le corps d'issue.
- [ ] Ajouter une synchronisation minimale du statut externe issue open/closed.
- [ ] Ajouter des webhooks provider pour détecter installation supprimée ou token révoqué.

## 7. Inbox, settings et analytics
- [ ] Ajouter la création, modification et suppression d'un site connecté depuis l'interface.
- [ ] Ajouter la modification des domaines autorisés par site.
- [ ] Ajouter la rotation de clé publique widget par site.
- [ ] Ajouter la désactivation temporaire d'un site sans supprimer son historique.
- [ ] Ajouter la suppression d'un site avec confirmation et impact affiché.
- [ ] Ajouter la gestion des connexions Git par workspace et non seulement par environnement serveur.
- [ ] Ajouter l'état d'expiration ou d'erreur des tokens GitHub/GitLab.
- [ ] Ajouter un test de connexion provider depuis la carte GitHub/GitLab.
- [ ] Ajouter le choix du dépôt cible depuis la liste provider avec recherche.
- [ ] Ajouter la configuration des labels d'issue par site.
- [ ] Ajouter la configuration du template d'issue par site.
- [ ] Ajouter la configuration de la langue par workspace.
- [ ] Ajouter une page profil utilisateur avec email, nom et préférences.
- [ ] Ajouter une pagination serveur pour `/projects`.
- [ ] Ajouter un tri serveur par date et statut pour l'inbox.
- [ ] Ajouter un filtre par site sur l'inbox.
- [ ] Ajouter un filtre par statut sur l'inbox.
- [ ] Ajouter un filtre par date sur l'inbox.
- [ ] Ajouter une recherche texte dans les feedbacks.
- [ ] Ajouter un export CSV des feedbacks filtrés.
- [ ] Ajouter un tableau de bord volume feedback par période.
- [ ] Ajouter un indicateur taux de conversion feedback vers issue créée.
- [ ] Ajouter un indicateur temps médian entre feedback reçu et issue créée.
- [ ] Ajouter une répartition des feedbacks par site.
- [ ] Ajouter une répartition des feedbacks par statut.
- [ ] Ajouter une répartition des erreurs provider par cause.
- [ ] Ajouter un suivi d'activation onboarding par workspace.
- [ ] Ajouter un suivi des limites de plan consommées.

## 8. Fiabilité et jobs
- [ ] Transformer la création d'issue en job asynchrone après réception feedback.
- [ ] Ajouter une file de jobs durable pour les créations d'issues.
- [ ] Ajouter un worker de retries indépendant des requêtes dashboard.
- [ ] Ajouter une route cron protégée pour traiter les retries dus.
- [ ] Ajouter un maximum de retries configurable.
- [ ] Ajouter un statut terminal après dépassement du maximum de retries.
- [ ] Ajouter un verrou distribué pour éviter deux créations d'issues concurrentes sur le même feedback.
- [ ] Ajouter un timeout explicite sur tous les appels GitHub.
- [ ] Ajouter un timeout explicite sur tous les appels GitLab.
- [ ] Ajouter un timeout explicite sur tous les appels Supabase REST.
- [ ] Ajouter un circuit breaker simple par provider.
- [ ] Ajouter une stratégie de backoff avec jitter.
- [ ] Ajouter une vue `failed` pour traiter les feedbacks en erreur.
- [ ] Ajouter une action de relance manuelle d'un feedback échoué.
- [ ] Ajouter une action d'annulation ou archivage définitif d'un feedback.
- [ ] Ajouter une protection contre les doublons de feedback soumis plusieurs fois par le widget.
- [ ] Ajouter une taille maximale de store ou pagination côté dashboard.
- [ ] Remplacer le rate limit mémoire par un store partagé compatible serverless.
- [ ] Ajouter un test de charge léger sur `POST /api/public/feedback` avec origines autorisées.
- [ ] Vérifier que les screenshots volumineux ne bloquent pas durablement le serveur Next.js.

## 9. Sécurité
- [ ] Ajouter des headers de sécurité Next.js dans `next.config.ts`.
- [ ] Ajouter une CSP compatible widget/dashboard.
- [ ] Ajouter `X-Frame-Options` ou `frame-ancestors` adapté au dashboard.
- [ ] Ajouter HSTS, Referrer-Policy, Permissions-Policy et X-Content-Type-Options.
- [ ] Ajouter une validation stricte des méthodes HTTP sur toutes les routes API.
- [ ] Ajouter une protection CSRF sur les POST privés du dashboard.
- [ ] Vérifier que toutes les actions privées exigent une session workspace.
- [ ] Ajouter une validation d'origine stricte pour `/api/widget/config`.
- [ ] Ne pas exposer `issueTarget` complet dans `/api/widget/config` si non nécessaire au widget.
- [ ] Ajouter une limite de longueur sur les champs texte dans les routes privées.
- [ ] Ajouter une validation MIME réelle des screenshots côté serveur.
- [ ] Ajouter un scan ou une stratégie de quarantaine pour les uploads image.
- [ ] Redacter les secrets et tokens dans tous les logs d'erreur.
- [ ] Ajouter une rotation documentée de `CHANGETHIS_SECRET_KEY`.
- [ ] Remplacer le stockage local chiffré des credentials provider par un coffre compatible production.
- [ ] Ajouter une vérification d'âge et d'intégrité du `state` OAuth provider.
- [ ] Signer le `state` OAuth avec HMAC.
- [ ] Ajouter la vérification des webhooks GitHub avec `GITHUB_WEBHOOK_SECRET`.
- [ ] Ajouter la vérification des webhooks GitLab avec `GITLAB_WEBHOOK_SECRET`.
- [ ] Ajouter une politique RLS d'insertion publique contrôlée pour les feedbacks si l'API écrit directement via Supabase.
- [ ] Ajouter des tests RLS pour owner, admin, member, viewer et utilisateur externe.
- [ ] Ajouter `npm audit --audit-level=high` comme gate documenté.
- [ ] Documenter chaque exception `npm audit` avec package, CVE, impact et plan de correction.
- [ ] Ajouter un scan de secrets local/CI sur l'historique et le workspace courant.
- [ ] Vérifier que `.changethis-data`, `.env*` et logs locaux restent exclus Git.

## 10. Tests et accessibilité
- [ ] Ajouter une CI qui exécute `npm test`, `npm run typecheck`, `npm run lint` et `npm run build`.
- [ ] Ajouter des tests unitaires pour `auth.ts`.
- [ ] Ajouter des tests unitaires pour `provider-integrations.ts`.
- [ ] Ajouter des tests unitaires pour `credential-store.ts`.
- [ ] Ajouter des tests unitaires pour `issue-providers.ts` avec fetch mocké.
- [ ] Ajouter des tests unitaires pour `issue-workflow.ts`.
- [ ] Ajouter des tests unitaires pour `project-registry.ts`.
- [ ] Ajouter des tests API pour `/api/public/feedback`.
- [ ] Ajouter des tests API pour `/api/widget/config`.
- [ ] Ajouter des tests API pour `/api/projects/issue-targets`.
- [ ] Ajouter des tests API pour `/api/projects/feedbacks/[id]/issue`.
- [ ] Ajouter des tests API pour `/api/projects/feedbacks/[id]/ignore`.
- [ ] Ajouter des tests API pour `/api/projects/retries`.
- [ ] Ajouter des tests API pour `/api/integrations/[provider]/repositories`.
- [ ] Ajouter des tests API pour les callbacks GitHub et GitLab.
- [ ] Ajouter des tests d'intégration Supabase repository.
- [ ] Ajouter des tests d'intégration Supabase Storage screenshots.
- [ ] Ajouter un scénario E2E `/demo` -> widget comment -> `/projects` visible.
- [ ] Ajouter un scénario E2E widget mode pin avec coordonnées persistées.
- [ ] Ajouter un scénario E2E widget mode capture avec asset screenshot persisté.
- [ ] Ajouter un scénario E2E création d'issue GitHub mockée depuis `/projects`.
- [ ] Ajouter un scénario E2E création d'issue GitLab mockée depuis `/projects`.
- [ ] Ajouter un scénario E2E retry provider `failed/retrying` -> `sent_to_provider`.
- [ ] Ajouter un scénario E2E accès `/projects` refusé sans session en `AUTH_MODE=supabase`.
- [ ] Ajouter un scénario E2E rôle `viewer` empêché de modifier les destinations d'issues.
- [ ] Ajouter des tests cross-browser du widget sur Chromium, Firefox et WebKit.
- [ ] Auditer `/`, `/demo`, `/login`, `/projects` et `/settings/*` avec axe automatisé.
- [ ] Ajouter des tests clavier pour ouvrir, utiliser et fermer le widget sans souris.
- [ ] Ajouter les labels ARIA manquants du widget pour modes, textarea, bouton d'envoi et notice.
- [ ] Vérifier le focus management du panneau widget à l'ouverture et à la fermeture.
- [ ] Vérifier les contrastes du widget pour variantes `default`, `dev`, `prod`, `review`.
- [ ] Vérifier les contrastes du dashboard pour badges, boutons, liens et états d'erreur.
- [ ] Tester les écrans critiques en viewport mobile 390px sans chevauchement de texte.
- [ ] Tester les écrans critiques en zoom navigateur 200%.

## 11. Observabilité et support
- [ ] Ajouter un endpoint `/api/health` sans secret.
- [ ] Ajouter un endpoint `/api/ready` qui vérifie DB, storage et provider config.
- [ ] Ajouter des métriques API: latence, taux 2xx/4xx/5xx, refus validation, refus origine et rate limit.
- [ ] Ajouter des métriques provider: succès, échecs, rate limits, retries dus et retries bloqués.
- [ ] Ajouter des métriques widget: erreurs d'envoi, temps de capture et version bundle.
- [ ] Ajouter une corrélation `request_id` dans toutes les réponses API critiques.
- [ ] Propager `request_id` dans les événements de statut.
- [ ] Ajouter un audit log pour changements de destination d'issue.
- [ ] Ajouter un audit log pour connexion/déconnexion provider.
- [ ] Ajouter un audit log pour invitations et changements de rôle.
- [ ] Ajouter une redaction automatique des payloads sensibles dans les logs.
- [ ] Ajouter une intégration d'erreurs runtime compatible production.
- [ ] Ajouter une intégration de tracing compatible Next.js.
- [ ] Ajouter un dashboard opérationnel minimal staging/production.
- [ ] Ajouter des alertes sur taux 5xx API.
- [ ] Ajouter des alertes sur échecs provider répétés.
- [ ] Ajouter des alertes sur feedbacks bloqués en `retrying`.
- [ ] Ajouter des alertes sur queue bloquée au-delà du SLO.
- [ ] Ajouter des alertes sur expiration prochaine des credentials provider.
- [ ] Ajouter une page aide intégrée avec installation widget, connexions Git et résolution d'erreurs.
- [ ] Ajouter un lien support visible dans le footer ou les paramètres.
- [ ] Ajouter un formulaire de contact support depuis l'app.
- [ ] Ajouter une collecte de contexte support incluant workspace, site, statut provider et request id.
- [ ] Ajouter des messages d'erreur actionnables pour OAuth, token manquant, origine refusée et rate limit.
- [ ] Ajouter une page interne de diagnostic par feedback ID avec événements et issue externe.

## 12. Billing, trial et plans
- [ ] Définir en code une structure de plans commerciaux avec limites sites, feedbacks, membres et stockage.
- [ ] Ajouter une page pricing publique alignée sur les plans définis.
- [ ] Ajouter un écran billing dans les paramètres.
- [ ] Ajouter un état trial actif avec date de fin visible dans l'app.
- [ ] Ajouter un état trial expiré avec blocage clair des actions payantes.
- [ ] Ajouter une logique d'upgrade/downgrade liée aux limites produit.
- [ ] Ajouter une intégration paiement pour abonnement SaaS.
- [ ] Ajouter un lien portail client accessible depuis billing.
- [ ] Ajouter un suivi des limites de plan consommées.
- [ ] Ajouter une matrice des fonctionnalités par plan dans la documentation.

## 13. Documentation client et release
- [ ] Créer une documentation "Démarrage rapide" orientée client SaaS.
- [ ] Créer une documentation "Installer le widget sur un site".
- [ ] Créer une documentation "Configurer GitHub".
- [ ] Créer une documentation "Configurer GitLab".
- [ ] Créer une documentation "Gérer les domaines autorisés".
- [ ] Créer une documentation "Comprendre les statuts de feedback".
- [ ] Créer une documentation "Créer et rejouer une issue".
- [ ] Créer une documentation "Sécurité et données capturées".
- [ ] Créer une documentation "FAQ commerciale".
- [ ] Ajouter des captures d'écran produit à la documentation.
- [ ] Ajouter une page changelog publique.
- [ ] Ajouter une checklist smoke staging après déploiement.
- [ ] Ajouter une checklist smoke production après déploiement.
- [ ] Ajouter versioning du widget et endpoint exposant la version déployée.
- [ ] Ajouter changelog release avec migrations, env vars et risques connus.
- [ ] Ajouter procédure rollback application.
- [ ] Ajouter procédure rollback widget.
- [ ] Ajouter procédure rollback migration DB.
- [ ] Ajouter validation Go/No-Go avec SLO API, taux succès provider et absence de pertes de feedback.

## 14. Runbooks opérationnels
- [ ] Ajouter runbook incident "feedback API retourne 5xx".
- [ ] Ajouter runbook incident "provider GitHub/GitLab rate limited".
- [ ] Ajouter runbook incident "OAuth provider cassé ou callback invalide".
- [ ] Ajouter runbook incident "feedbacks bloqués en retrying".
- [ ] Ajouter runbook incident "origine client refusée par CORS".
- [ ] Ajouter runbook incident "secret compromis".
- [ ] Ajouter runbook incident "restore backup nécessaire".
- [ ] Ajouter runbook incident "provider indisponible".
- [ ] Ajouter runbook incident "base indisponible".
- [ ] Ajouter modèle de réponse support pour bug widget client.
- [ ] Ajouter modèle de réponse support pour problème connexion GitHub/GitLab.

## 15. Légal et conformité technique
- [ ] Ajouter une page sécurité décrivant secrets, RLS, stockage, backups et accès provider.
- [ ] Ajouter une mention visible sur les données capturées par le widget.
- [ ] Ajouter un mécanisme de masquage documenté des champs sensibles.
- [ ] Ajouter une procédure d'export des données workspace.
- [ ] Ajouter une procédure de suppression des données workspace.
- [ ] Ajouter une politique TTL configurable pour screenshots et feedbacks selon statut.
- [ ] Vérifier que les screenshots ne sont pas stockés durablement en data URL en production.
- [ ] Ajouter une revue consentement/cookies si des analytics marketing sont ajoutés.

## Audit Investisseur (pré-GO)
- [ ] (P0) Préparer une matrice ICP + pricing narrative avec 3 plans de départ (free pilot/pro/team) et hypothèses de coût d'acquisition.
- [ ] (P0) Remplacer la source projet localisée (`apps/web/lib/demo-project.ts`, `apps/web/lib/project-registry.ts`) par une persistance workspace-backed dès que possible hors DEV.
- [ ] (P0) Implémenter une garde de démarrage qui bloque en production `AUTH_MODE=local`, `DATA_STORE=file`, projet fallback local, variables critiques manquantes.
- [ ] (P0) Finaliser la logique tenant-safe: toutes les routes dashboard et API critiques scoping systématique `workspaceId`, y compris `/api/public/feedback`, `/api/projects/*`, `/api/integrations/*`.
- [ ] (P0) Implémenter/renforcer les permissions server-side `viewer`, `member`, `admin`, `owner` sur l’ensemble des routes privatives avant exposition client.
- [ ] (P1) Mettre en place le flux de retries durable et idempotent via queue + worker + verrou de concurrence pour éviter la double création d'issue.
- [ ] (P1) Créer `/api/health` et `/api/ready` + checks SLO/SLI de base (`2xx/4xx/5xx`, retry backlog, latence et disponibilité provider).
- [ ] (P1) Ajouter une première couche de sécurité web: headers de sécurité HTTP, CSP, validation méthode/origine, CSRF sur POST dashboard.
- [ ] (P1) Migrer définitivement les screenshots hors data URL persistées, vers stockage objet + TTL de rétention.
- [ ] (P1) Finaliser onboarding réel du 1er feedback: création de site, script intégré, destination issue sélectionnée, confirmation issue créée.
- [ ] (P2) Publier pages commerciales minimales: pricing, démarrage rapide, installation widget, FAQ commerciale.
- [ ] (P2) Construire la logique de limites de plans (quotas) et d’impact visible dans le produit, sans encore verrouiller le fournisseur de paiement.
- [ ] (P2) Ajouter les fonctions de sortie client: export feedback, suppression définitive workspace/site/feedback, diagnostic par feedback ID.
- [ ] (P2) Formaliser conformité opérationnelle: privacy/RGPD, retention, DPA, politique cookies si analytics marketing.

## Intervention utilisateur requise
- [ ] (depuis Audit Investisseur) Valider la proposition de valeur commerciale et définir l'ICP prioritaire (freelance, agence, studio).
- [ ] (depuis section 12) Valider la structure des plans commerciaux: limites par plan, trial actif/expiré, seuils d'upgrade/downgrade, usages facturables et règles de blocage.
- [ ] (depuis section 12) Valider la stratégie de paiement: provider retenu, conditions du cycle payant, portail client et UX billing.
- [ ] (depuis sections 12, 13, 15) Valider le copy définitif du pricing, de la FAQ commerciale, de la documentation onboarding/widget, et des contenus de conformité client.
- [ ] Valider le positionnement commercial cible: freelance, agence, studio ou équipe produit B2B.
- [ ] Valider les plans, prix, limites d'usage et durée du trial.
- [ ] Choisir le fournisseur de paiement.
- [ ] Choisir l'hébergeur production pour l'application Next.js.
- [ ] Choisir le domaine public de l'application ChangeThis.
- [ ] Configurer les DNS du domaine choisi vers l'hébergeur.
- [ ] Créer le projet Supabase production.
- [ ] Fournir `NEXT_PUBLIC_SUPABASE_URL` production.
- [ ] Fournir `NEXT_PUBLIC_SUPABASE_ANON_KEY` production.
- [ ] Fournir `SUPABASE_SERVICE_ROLE_KEY` production.
- [ ] Créer le bucket Supabase Storage production pour les screenshots.
- [ ] Choisir la solution de stockage objet production si Supabase Storage n'est pas retenu.
- [ ] Choisir la politique de rétention des feedbacks et screenshots.
- [ ] Générer et fournir `CHANGETHIS_SECRET_KEY` production.
- [ ] Créer ou valider la GitHub App ChangeThis.
- [ ] Fournir `GITHUB_APP_SLUG`.
- [ ] Fournir `GITHUB_APP_ID`.
- [ ] Fournir `GITHUB_APP_PRIVATE_KEY`.
- [ ] Fournir `GITHUB_WEBHOOK_SECRET`.
- [ ] Installer la GitHub App sur les repositories clients pilotes.
- [ ] Créer ou valider l'application OAuth GitLab.
- [ ] Fournir `GITLAB_OAUTH_APP_ID`.
- [ ] Fournir `GITLAB_OAUTH_APP_SECRET`.
- [ ] Fournir `GITLAB_WEBHOOK_SECRET`.
- [ ] Choisir si GitLab self-hosted doit être supporté dès la première version commerciale.
- [ ] Fournir `GITLAB_BASE_URL` si GitLab self-hosted est retenu.
- [ ] Choisir le provider de coffre secrets production si le stockage local chiffré est remplacé.
- [ ] Choisir l'outil de monitoring, alerting, erreurs et traces.
- [ ] Choisir l'outil de scan secrets/vulnérabilités utilisé en CI.
- [ ] Définir les SLO commerciaux: disponibilité API, latence p95, taux succès provider, délai de création d'issue et MTTR.
- [ ] Choisir si les inscriptions publiques sont ouvertes au lancement.
- [ ] Choisir le modèle de workspace initial: mono-organisation par compte ou multi-workspace.
- [ ] Choisir si la création d'issue doit être automatique dès réception ou validée manuellement par défaut.
- [ ] Fournir les contenus marketing de la page pricing.
- [ ] Fournir les contenus support et adresse de contact support.
- [ ] Valider le modèle support: canal, horaires, SLA et owner d'astreinte.
- [ ] Faire rédiger ou valider Privacy Policy, CGV/Terms, DPA et politique cookies.
- [ ] Valider les métriques analytics autorisées et leur conformité RGPD.
- [ ] Valider les clients pilotes et le périmètre du dry-run staging.
- [ ] Donner le feu vert final Go/No-Go avant activation commerciale.

## Journal
- [2026-05-01] Documentation priorisation hors checklist: ajout de `docs/ai-task-priority-triage.md` avec classement des taches `AI_TODO.md` en 3 categories (`Urgent`, `A faire d'ici 7 jours maximum`, `Bonus`) et ordre d'importance dans chaque categorie. Validation locale non lancee automatiquement conformement a la consigne utilisateur active.
- [2026-05-01] Documentation prod hors checklist: OVH retenu pour le registrar et le DNS a ce stade; `docs/ovh-production-auth-decisions.md` ne contient plus de question ouverte immediate. Validation locale non lancee automatiquement conformement a la consigne utilisateur active.
- [2026-05-01] Documentation prod hors checklist: beta privee confirmee avec signup public ferme; pour la reouverture, la decision retenue est lien e-mail obligatoire + captcha anti-abus + rate limit. `docs/ovh-production-auth-decisions.md` mis a jour et la derniere question active porte maintenant sur le maintien d'OVH ou une future migration DNS vers Cloudflare. Validation locale non lancee automatiquement conformement a la consigne utilisateur active.
- [2026-05-01] Documentation prod hors checklist: duree de session cible fixee a `7 jours`; `docs/ovh-production-auth-decisions.md` mis a jour et la prochaine question active porte maintenant sur la protection anti-abus du signup public au moment de sa reouverture. Validation locale non lancee automatiquement conformement a la consigne utilisateur active.
- [2026-05-01] Documentation prod hors checklist: `Cloudflare R2` retenu pour le stockage production des screenshots; `docs/ovh-production-auth-decisions.md` mis a jour et la prochaine question active porte maintenant sur la duree de session. Validation locale non lancee automatiquement conformement a la consigne utilisateur active.
- [2026-05-01] Documentation prod hors checklist: mise a jour de `docs/ovh-production-auth-decisions.md` pour separer l'etat reel deploye (Railway, domaine, beta privee fermee, auth Supabase actuelle), les decisions deja prises, les points a revalider et les questions restantes encore utiles. Validation locale non lancee automatiquement conformement a la consigne utilisateur active.
- [2026-05-01] Correctif bêta privée hors checklist: `/signup` ne redirige plus côté serveur quand les inscriptions sont fermées; la page affiche maintenant un état fermé propre avec renvoi vers `/login`, pour éviter une erreur serveur en prod sur `app.changethis.dev`. Validation locale non lancée automatiquement conformément à la consigne utilisateur active.
- [2026-05-01] Correctif header hors checklist: le header n'affiche plus la navigation applicative en état déconnecté et bascule automatiquement vers l'état public `Connexion / Inscription` sur les pages qui exposent des liens d'app, pour garder un état connecté/déconnecté cohérent sur home, démo et vues protégées. Validation locale non lancée automatiquement conformément à la consigne utilisateur active.
- [2026-05-01] Micro-amélioration copy hors checklist: `/login` mentionne désormais explicitement la bêta privée dans son eyebrow et son texte principal, pour ne pas dépendre uniquement du callout conditionnel `ENABLE_PUBLIC_SIGNUP`. Validation locale non lancée automatiquement conformément à la consigne utilisateur active.
- [2026-05-01] Micro-amélioration branding hors checklist: ajout d'un favicon Next.js en réutilisant le logo existant via `apps/web/app/icon.png`, pour afficher l'identité ChangeThis dans l'onglet navigateur et les favoris. Validation locale non lancée automatiquement conformément à la consigne utilisateur active.
- [2026-04-30] Micro-amélioration UI capture hors checklist: adaptation de la modale screenshot aux captures mobiles avec panneau plus étroit, image mobile centrée et grille dédiée. Validation non lancée automatiquement conformément à la consigne utilisateur active.
- [2026-04-30] Micro-amélioration UX copy hors checklist: remplacement du libellé bouton `Rejouer` par `Réenvoyer` et ajustement du texte d'aide associé. Validation non lancée automatiquement conformément à la consigne utilisateur active.
- [2026-04-30] Micro-correction demo hors checklist: ajout d'une vraie `screenshotDataUrl` synthétique aux feedbacks de type screenshot du seed réaliste, pour éviter l'incohérence tag `screenshot` + `Sans capture`. Validation non lancée automatiquement conformément à la consigne utilisateur active.
- [2026-04-30] Micro-amélioration UI dashboard hors checklist: correction du menu `Plus` des actions feedback en panneau superposé pour éviter qu'il casse l'espacement des lignes. Validation non lancée automatiquement conformément à la consigne utilisateur active.
- [2026-04-30] Micro-amélioration UX dashboard hors checklist: masquage du bouton de réessai sauf s'il y a plusieurs feedbacks à retenter, couleur warning dédiée, seed demo ajusté avec deux retries dus, et ajout d'un bouton non-prod `Vider la démo`. Validation non lancée automatiquement conformément à la consigne utilisateur active.
- [2026-04-30] Micro-amélioration UX dashboard hors checklist: ajout d'une création d'issues par lot via sélection de feedbacks, et remplacement de `Prochain essai automatique` par un libellé non trompeur. Validation non lancée automatiquement conformément à la consigne utilisateur active.
- [2026-04-30] Micro-amélioration UX dashboard hors checklist: remplacement du titre redondant issu du brouillon d'issue par un titre de carte structurel `Type sur /page`, pour laisser le message utilisateur porter le contenu. Validation non lancée automatiquement conformément à la consigne utilisateur active.
- [2026-04-30] Micro-amélioration UX dashboard hors checklist: extraction visuelle du reporter depuis les messages `Nom: ...` pour afficher `Envoyé par ...` hors de la ligne de texte du feedback. Validation non lancée automatiquement conformément à la consigne utilisateur active.
- [2026-04-30] Micro-amélioration UX copy hors checklist: remplacement du vocabulaire ambigu `relances dues` par `réessayer les issues en attente` et messages toast plus explicites. Validation non lancée automatiquement conformément à la consigne utilisateur active.
- [2026-04-30] Micro-amélioration UX dashboard hors checklist: ajout du modèle `File active / Historique / Tous` pour éviter qu'un compte après un an affiche une liste interminable de feedbacks terminés par défaut. Validation non lancée automatiquement conformément à la consigne utilisateur active.
- [2026-04-30] Micro-amélioration UX dashboard hors checklist: simplification des lignes feedback avec brouillon/contexte repliés, actions secondaires sous `Plus`, et grille moins dense selon l'analyse des agents UX/produit/front. Validation non lancée automatiquement conformément à la consigne utilisateur active.
- [2026-04-30] Micro-amélioration demo hors checklist: ajout d'un bouton dashboard `Créer une simulation réaliste` et d'une route admin non-prod qui crée dynamiquement plusieurs sites, providers Git et feedbacks synthétiques avec statuts variés. Validation non lancée automatiquement conformément à la consigne utilisateur active.
- [2026-04-30] Micro-amélioration test/demo hors checklist: ajout d'un preset client fictif `Atelier Nova` injecté par défaut dans le widget `/demo` via les attributs d'environnement, release, build, branche, scénario et test run. Validation non lancée automatiquement conformément à la consigne utilisateur active.
- [2026-04-30] Micro-amélioration UX hors checklist: bouton `Ignorer` passé en style danger rouge avec confirmation native avant archivage. Validation non lancée automatiquement conformément à la consigne utilisateur active.
- [2026-04-30] Micro-amélioration UI hors checklist: rééquilibrage des colonnes des lignes feedback du dashboard pour réduire le vide dans la colonne principale et mieux réserver l'espace brouillon/actions. Validation non lancée automatiquement conformément à la consigne utilisateur active.
- [2026-04-30] Micro-amélioration UI hors checklist: passage du texte général du hero en bleu accent pour laisser GitHub en noir et GitLab en orange marque. Validation non lancée automatiquement conformément à la consigne utilisateur active.
- [2026-04-30] Micro-amélioration UX hors checklist: ajout d'un tutoriel compact sur la page Connexions Git, conçu avec deux agents UX, pour expliquer connexion, dépôt et création d'issue. Validation non lancée automatiquement conformément à la consigne utilisateur active.
- [2026-04-30] Micro-amélioration UI hors checklist: renommage du bouton sidebar dashboard `Sites` en `Sites connectés`. Validation non lancée automatiquement conformément à la consigne utilisateur active.
- [2026-04-30] Micro-amélioration UI hors checklist: ajout du footer partagé sur la page `/demo`. Validation non lancée automatiquement conformément à la consigne utilisateur active.
- [2026-04-30] Micro-amélioration UI hors checklist: aperçu hero rendu plus représentatif avec des feedbacks factices incluant Patrick et Jean-Pierre. Validation non lancée automatiquement conformément à la consigne utilisateur active.
- [2026-04-30] Micro-amélioration UI hors checklist: ajout des logos vectoriels GitHub et GitLab inline dans la phrase du hero. Validation non lancée automatiquement conformément à la consigne utilisateur active.
- [2026-04-30] Micro-amélioration widget hors checklist: ajout d'un mode bouton discret configuré par site et d'un évitement automatique des footers visibles pour les positions basses. Validation non lancée automatiquement conformément à la consigne utilisateur active.
- [2026-04-28] Tâche 14 complétée: filtrage dashboard par `workspaceId` issu de la session pour les vues `/projects`, `/settings` et `/api/projects/issue-targets`, via `getFeedbackRepository().list` et `listConfiguredProjects()`.
- [2026-04-28] Tâche 13 complétée: restriction runtime de `getCurrentSession` en production pour interdire la session locale de fallback (`AUTH_MODE=local`).
- [2026-04-28] Tâche 11 complétée: implémentation du login Supabase réel sur `/login` via `signInWithPassword` et cookie serveur `changethis_access_token`.
- [2026-04-28] Tâche 12 complétée: ajout de la route `apps/web/app/api/auth/callback/route.ts` pour poser le session-cookie Supabase après redirection.
- [2026-04-28] Tâche 10 complétée: garde production dans `scripts/check-env.mjs` contre les project keys fallback connues.
- [2026-04-28] Tâche 9 complétée: ajout de la validation production dans `scripts/check-env.mjs` interdisant `DATA_STORE=file`.
- [2026-04-28] Tâche 8 complétée: ajout d'une validation production dans `scripts/check-env.mjs` interdisant `AUTH_MODE=local` en production.
- [2026-04-28] Tâche 7 complétée: ajout de `scripts/check-env.mjs` + script npm `env:check` pour valider les vars d’environnement critiques et les secrets selon le mode.
- [2026-04-28] Tâche 6 complétée: création de `.env.production.example` (sans secrets) listant les variables production attendues.
- [2026-04-28] Tâche 5 complétée: mise à jour de `docs/local-env-minimal.md` avec les variables réellement nécessaires en local et les variables optionnelles par scénario.
- [2026-04-28] Tâche 4 complétée: ajout d'une section `widget -> inbox -> issue` explicite dans `README.md` pour le parcours produit cible.
- [2026-04-28] Tâche 3 complétée: ajout d'une matrice prototype / beta / commercialisable (auth, données, widget, intégrations, support, billing) dans `docs/production-readiness-plan.fr.md`.
- [2026-04-28] Tâche 2 complétée: ajout d'une checklist Go/No-Go commerciale dans `docs/production-readiness-plan.fr.md` (critères bloquants de lancement commercial).
- [2026-04-28] Tâche 1 complétée: création de `docs/commercial-readiness-map.md` avec une matrice structurée des blocs manquants (produit, architecture, intégrations, conformité, opérations, commercial) pour passer au mode SaaS.


- 2026-04-30: Micro-amélioration UX dashboard hors checklist: le bouton local `Réenvoyer` réutilise le style warning existant `retry-batch-button` pour éviter un CTA primaire sur un échec d'envoi. Validation non lancée, non demandée.

- 2026-04-30: Micro-amélioration UX Connexions Git hors checklist: le tutoriel rapide n'apparaît plus que sans connexion Git active/configurée et contient les CTA GitHub/GitLab. Validation non lancée, non demandée.

- 2026-04-30: Simulation réaliste étendue hors checklist: le seed crée aussi des connexions Git locales de démo, les dépôts simulés alimentent Paramètres > Comptes Git et Sites connectés, et les boutons simulation/reset sont visibles sur ces écrans. Le reset ne supprime que les credentials marqués démo. Validation non lancée, non demandée.

- 2026-04-30: Micro-amélioration SaaS Header hors checklist: ajout de badges Auth/Stockage pour distinguer local vs Supabase/DB et affichage du CTA d'inscription en session locale pour préparer le portage base de données. Nouveaux agents non lancés: limite de threads atteinte. Validation non lancée, non demandée.

- 2026-04-30: Simulation réaliste mise à jour hors checklist: le seed démo crée désormais 20 feedbacks distincts en attente, répartis sur les sites GitHub/GitLab afin que Issues et Paramètres > Sites connectés affichent les mêmes données de simulation. Validation non lancée, non demandée.

- 2026-04-30: Micro-amélioration UX Header hors checklist: les états actifs de navigation et du sélecteur de langue passent en slate/soft discret pour réserver le bleu aux CTA primaires. Agent UX Jason consulté. Validation non lancée, non demandée.

- 2026-04-30: Micro-amélioration UX démo hors checklist: le bouton de simulation est désormais exclusif selon l'état réel du seed; création affichée sans démo live, reset affiché quand une simulation réaliste existe. Validation non lancée, non demandée.

- 2026-04-30: Micro-amélioration communication homepage hors checklist: ajout de balises strong ciblées sur les bénéfices clés du hero, des cartes produit, du workflow et de l'installation. Agent communication non lancé: limite de threads atteinte. Validation non lancée, non demandée.

- 2026-04-30: Refonte UX /demo hors checklist: transformation de la page démo en faux site client Atelier Nova avec style éditorial distinct, lorem ipsum, guide explicite et panneau fixe indiquant le bouton Feedback en bas à droite. Un agent UI lancé; deux autres agents refusés par limite de threads. Validation non lancée, non demandée.

- 2026-04-30: Amélioration crédibilité /demo hors checklist: ajout d'un historique Atelier Nova avec timeline depuis 2018, avis clients datés et retours fictifs pour rendre le faux site client plus vivant. Validation non lancée, non demandée.

- 2026-04-30: UX dashboard hors checklist: suppression du bouton Filtrer au profit d'une mise à jour automatique des filtres; selects soumis au changement, recherche débouncée, compteur explicite et reset renommé Effacer les filtres. 5 agents UX/UI consultés: consensus pour inbox dense hybride plutôt qu'un tableau pur immédiat. Validation non lancée, non demandée.

- 2026-04-30: Déploiement palette Material hors checklist: 5 agents UX/UI consultés, adoption des tokens primary indigo #3f51b5 et secondary amber #ffb300, mapping des CTA/actifs/focus/badges, conservation des couleurs GitHub/GitLab et de la démo Atelier Nova. Validation non lancée, non demandée.

- 2026-04-30: Correction démo actions hors checklist: les feedbacks marqués manual-demo-* ou realistic-demo-seed-* peuvent être créés en issue, synchronisés, conservés, ignorés et traités en bulk sans dépendre d'un provider Git réel ni échouer sur un scope local de workspace. Validation non lancée, non demandée.

- 2026-04-30: Intégration synthèse UX dashboard hors checklist: les feedbacks passent progressivement en grille de colonnes desktop Feedback / Site-page / Statut / Issue / Reçu / Actions, tout en conservant un rendu empilé mobile. Validation non lancée, non demandée.

- [2026-04-30] Micro-amélioration widget hors checklist: affichage d'une miniature cliquable des captures déjà envoyées dans la modale Manage feedback, en conservant la data URL de capture côté historique local quand disponible. Validation non lancée automatiquement conformément à la consigne utilisateur active.

- [2026-04-30] Micro-amélioration UI homepage hors checklist: remplacement des pictogrammes abstraits du flux produit par des répliques de composants ChangeThis pour la capture complète, l'inbox exploitable et l'issue prête. Validation non lancée automatiquement conformément à la consigne utilisateur active.

- [2026-04-30] Micro-amélioration copy homepage hors checklist: reformulation du deuxième bloc du flux produit pour vendre la décision rapide, le tri des retours, le commentaire et la réponse dans GitHub/GitLab plutôt que l'historique des relances. Validation non lancée automatiquement conformément à la consigne utilisateur active.

- [2026-04-30] Micro-amélioration signup production hors checklist: passage du signup en email-first, suppression organisation/password du premier écran, envoi d'un lien sécurisé Supabase OTP, ajout d'une page cliente de confirmation du lien et d'une étape de choix du mot de passe qui crée automatiquement l'espace depuis l'e-mail. Blocage restant: une vraie prod sur base OVH seule exige encore une auth applicative, un mailer SMTP et une persistance DB hors Supabase. Validation non lancée automatiquement conformément à la consigne utilisateur active.

- [2026-04-30] Micro-correction démo dashboard hors checklist: la simulation réaliste répartit désormais les feedbacks sur tous les statuts utiles et le filtre Statut affiche les compteurs par état, pour démontrer que les vues et filtres fonctionnent réellement. Validation non lancée automatiquement conformément à la consigne utilisateur active.

- [2026-04-30] Documentation pilotage prod OVH hors checklist: ajout de docs/ovh-production-auth-decisions.md pour figer les décisions déjà prises, l'ordre d'implémentation auth OVH native et les questions restantes à poser une par une. Validation non lancée automatiquement conformément à la consigne utilisateur active.

- [2026-04-30] Documentation OVH hors checklist: ajout de docs/ovh-zero-to-prod-guide.md pour guider un depart de zero OVH vers une prod ChangeThis avec recommandation PostgreSQL, VPS/Public Cloud, SMTP et auth native applicative. Validation non lancée automatiquement conformément à la consigne utilisateur active.

- [2026-04-30] Documentation décisions prod hors checklist: mise à jour de docs/ovh-production-auth-decisions.md avec la décision Railway + PostgreSQL + Brevo, budget beta en euros, domaine possible chez OVH et questions restantes réordonnées. Validation non lancée automatiquement conformément à la consigne utilisateur active.

- [2026-04-30] Documentation décisions prod hors checklist: PostgreSQL ajouté comme moteur DB validé dans docs/ovh-production-auth-decisions.md; le choix restant porte sur Railway intégré vs Neon séparé. Validation non lancée automatiquement conformément à la consigne utilisateur active.


- [2026-04-30] Documentation décisions prod hors checklist: Railway intégré retenu pour PostgreSQL beta; décisions par défaut ajoutées pour activation e-mail avec fallback code, mono-workspace initial, création d'issue manuelle avec lot, et règle IA de décision à 70%. Validation non lancée automatiquement conformément à la consigne utilisateur active.

- [2026-04-30] Documentation déploiement prod hors checklist: ajout de `docs/deploy-railway-ovh-changethis-dev.md` avec le chemin concret OVH domaine -> Railway app -> PostgreSQL Railway -> DNS `app.changethis.dev`, et mise à jour des décisions avec le domaine retenu `changethis.dev`. Validation non lancée automatiquement conformément à la consigne utilisateur active.
- [2026-04-30] Correctif déploiement Railway hors checklist: ajout du script `start` dans `apps/web/package.json` pour permettre à Railway d'exécuter `next start` sur le workspace web après le build. Validation locale non lancée automatiquement conformément à la consigne utilisateur active.
- [2026-04-30] Contrôle d'accès signup hors checklist: branchement réel de `ENABLE_PUBLIC_SIGNUP` pour masquer le CTA public, supprimer le lien de login vers signup quand fermé, et rediriger `/signup` vers `/login` tant que les inscriptions publiques ne sont pas ouvertes. Validation locale non lancée automatiquement conformément à la consigne utilisateur active.
- [2026-04-30] Correctif prod logout hors checklist: `AppHeader` résout désormais la session courante lui-même quand une page ne la fournit pas, ce qui réaffiche le menu session/logout sur `/`, `/demo`, `/login`, `/signup` et `/signup/set-password`; `/auth/confirm` utilise maintenant un wrapper serveur avec le même header. Validation locale non lancée automatiquement conformément à la consigne utilisateur active.
- [2026-04-30] Fermeture beta signup hors checklist: ajout d'une bannière explicite “bêta privée / inscriptions fermées” sur la home et `/login`, en cohérence avec le verrou existant `ENABLE_PUBLIC_SIGNUP=false` et la redirection de `/signup` vers `/login`. Validation locale non lancée automatiquement conformément à la consigne utilisateur active.
- [2026-04-30] Nettoyage copy beta privée hors checklist: suppression des formulations marketing trop ouvertes autour de “créer un compte”, ajout d'un lien direct vers `/login` sur la home quand l'inscription est fermée, et réalignement des clés marketing dormantes `home.signup.*` / `home.hero.signup` sur un positionnement invitation-only. Validation locale non lancée automatiquement conformément à la consigne utilisateur active.
- [2026-04-30] Correctif prod widget démo hors checklist: ajout de l'origine `NEXT_PUBLIC_APP_URL` aux `allowedOrigins` du `demoProject`, afin que `/demo` puisse réellement poster vers `/api/public/feedback` depuis `app.changethis.dev` et pas seulement depuis `localhost`. Validation locale non lancée automatiquement conformément à la consigne utilisateur active.

