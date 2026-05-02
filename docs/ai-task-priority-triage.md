# Priorisation des taches AI_TODO

Date: 2026-05-01

Statut 2026-05-02: snapshot historique. Ne pas l'utiliser comme backlog courant sans le comparer a [current-state.fr.md](current-state.fr.md) et `AI_TODO.md`. Plusieurs items listes ici sont deja partiellement ou totalement livres: repositories Supabase, scoping workspace, headers securite, `/api/health`, `/api/ready`, widget public, provider integrations Supabase et page membres.

Contexte pris en compte:
- app deployee sur Railway
- domaine actif `app.changethis.dev`
- beta privee
- auth encore basee sur Supabase
- persistance production encore transitoire sur certaines briques

Objectif:
- classer les taches de `AI_TODO.md` en 3 categories
- ordonner les taches par importance dans chaque categorie
- privilegier la mise en production beta credible avant le polish

## 1. Urgent

Ces taches bloquent directement la beta SaaS credible, soit pour la securite, soit pour la fiabilite, soit pour l'isolation des donnees.

1. Filtrer toutes les lectures de feedbacks par `workspace`
2. Filtrer toutes les lectures de projets/sites par `workspace`
3. Filtrer toutes les integrations provider par `workspace`
4. Verifier que toutes les actions privees exigent une session `workspace`
5. Appliquer les roles `viewer`, `member`, `admin`, `owner` sur chaque route API privee
6. Restreindre la modification des destinations d'issues aux roles `admin` et `owner`
7. Restreindre les relances de retries aux roles `admin` et `owner`
8. Implementer un repository Supabase/Postgres pour les feedbacks
9. Implementer un repository Supabase/Postgres pour les evenements de statut
10. Implementer un repository Supabase/Postgres pour les projets/sites
11. Implementer un repository Supabase/Postgres pour les destinations d'issues
12. Implementer un repository Supabase/Postgres pour les integrations provider
13. Ajouter un switch `DATA_STORE=supabase` qui utilise uniquement Postgres en production
14. Lire les project public keys actifs depuis la base plutot que depuis des constantes locales
15. Supprimer la dependance production aux projets codes en dur dans `demo-project.ts`
16. Transformer la creation d'issue en job asynchrone apres reception feedback
17. Ajouter une file de jobs durable pour les creations d'issues
18. Ajouter un worker de retries independant des requetes dashboard
19. Remplacer le rate limit memoire par un store partage compatible serverless
20. Ajouter des headers de securite Next.js dans `next.config.ts`
21. Ajouter une CSP compatible widget/dashboard
22. Ajouter HSTS, Referrer-Policy, Permissions-Policy et X-Content-Type-Options
23. Ajouter une validation stricte des methodes HTTP sur toutes les routes API
24. Ajouter une protection CSRF sur les POST prives du dashboard
25. Redacter les secrets et tokens dans tous les logs d'erreur
26. Remplacer le stockage local chiffre des credentials provider par un coffre compatible production
27. Ajouter un endpoint `/api/health` sans secret
28. Ajouter un endpoint `/api/ready` qui verifie DB, storage et provider config
29. Ajouter une integration d'erreurs runtime compatible production
30. Ajouter une CI qui execute `npm test`, `npm run typecheck`, `npm run lint` et `npm run build`

## 2. A faire d'ici 7 jours maximum

Ces taches ne bloquent pas toutes immediatement la mise en ligne beta, mais elles doivent suivre vite pour rendre l'application exploitable et defendable face a de vrais utilisateurs pilotes.

1. Finaliser le flux GitHub App installation avec recuperation et stockage de l'installation par workspace
2. Finaliser la creation de token GitHub installation par integration workspace
3. Associer chaque issue target GitHub a une integration provider explicite
4. Valider que le repository selectionne appartient a l'integration GitHub connectee
5. Finaliser le refresh token GitLab OAuth
6. Associer chaque issue target GitLab a une integration provider explicite
7. Valider que le projet GitLab selectionne appartient a l'integration GitLab connectee
8. Ajouter la deconnexion d'un compte GitHub
9. Ajouter la deconnexion d'un compte GitLab
10. Ajouter la reconnexion d'un provider en statut `needs_reconnect`
11. Ajouter une verification periodique de validite des credentials provider
12. Migrer les screenshots depuis les data URLs vers Supabase Storage ou stockage objet
13. Stocker uniquement un chemin d'objet ou une URL signee pour chaque screenshot
14. Ajouter une procedure de backup Supabase avec frequence, retention et owner
15. Ajouter une procedure de restore Supabase testee sur environnement isole
16. Ajouter la creation, modification et suppression d'un site connecte depuis l'interface
17. Ajouter la modification des domaines autorises par site
18. Ajouter la rotation de cle publique widget par site
19. Ajouter un etat vide guide pour `/projects` quand aucun site reel n'est configure
20. Ajouter un etat vide guide pour `/settings/connected-sites` quand aucun site n'existe
21. Ajouter une action `Creer un site` avec nom, domaine autorise et cle publique generee
22. Ajouter une validation visible des origines autorisees avant de fournir le script widget
23. Ajouter un test de feedback depuis un site configure, distinct de la page `/demo`
24. Ajouter un flux d'onboarding qui cree l'organisation, le workspace, l'owner et le premier site
25. Definir le parcours premier utilisateur de `signup/login` jusqu'au premier feedback recu
26. Creer une checklist onboarding affichee dans l'app avec etapes compte Git, site, script, feedback test et issue creee
27. Ajouter une confirmation de fin d'onboarding quand un feedback reel cree une issue externe
28. Ajouter une vue `failed` pour traiter les feedbacks en erreur
29. Ajouter une action de relance manuelle d'un feedback echoue
30. Ajouter une action d'annulation ou archivage definitif d'un feedback
31. Ajouter une protection contre les doublons de feedback soumis plusieurs fois par le widget
32. Ajouter une pagination serveur pour `/projects`
33. Ajouter un tri serveur par date et statut pour l'inbox
34. Ajouter un filtre par site sur l'inbox
35. Ajouter un filtre par statut sur l'inbox
36. Ajouter un filtre par date sur l'inbox
37. Ajouter une recherche texte dans les feedbacks
38. Ajouter des messages d'erreur actionnables pour OAuth, token manquant, origine refusee et rate limit
39. Ajouter une page aide integree avec installation widget, connexions Git et resolution d'erreurs
40. Ajouter un lien support visible dans le footer ou les parametres
41. Verifier que les screenshots volumineux ne bloquent pas durablement le serveur Next.js
42. Ajouter des tests API pour `/api/public/feedback`
43. Ajouter des tests API pour `/api/widget/config`
44. Ajouter des tests API pour `/api/projects/issue-targets`
45. Ajouter des tests API pour `/api/projects/feedbacks/[id]/issue`
46. Ajouter des tests API pour `/api/projects/feedbacks/[id]/ignore`
47. Ajouter des tests API pour `/api/projects/retries`
48. Ajouter un scenario E2E `/demo` -> widget comment -> `/projects` visible

## 3. Bonus, pas urgent du tout

Ces taches ameliorent la maturite, l'echelle, le confort ou la profondeur produit, mais elles ne sont pas le chemin le plus court vers une beta solide.

1. Ajouter une page de gestion des membres du workspace
2. Ajouter une invitation membre avec statut `invited`
3. Ajouter une desactivation membre avec statut `disabled`
4. Ajouter un selecteur de workspace si un utilisateur appartient a plusieurs organisations
5. Ajouter la pagination complete des repositories GitHub au-dela de 100 resultats
6. Ajouter la pagination complete des projets GitLab au-dela de 100 resultats
7. Ajouter la recherche serveur des repositories providers
8. Ajouter la configuration des labels d'issue par site
9. Ajouter la configuration du template d'issue par site
10. Ajouter la configuration de la langue par workspace
11. Ajouter une page profil utilisateur avec email, nom et preferences
12. Ajouter un export CSV des feedbacks filtres
13. Ajouter un tableau de bord volume feedback par periode
14. Ajouter un indicateur taux de conversion feedback vers issue creee
15. Ajouter un indicateur temps median entre feedback recu et issue creee
16. Ajouter une repartition des feedbacks par site
17. Ajouter une repartition des feedbacks par statut
18. Ajouter une repartition des erreurs provider par cause
19. Ajouter un suivi d'activation onboarding par workspace
20. Ajouter un suivi des limites de plan consommees
21. Definir un budget de taille pour `packages/widget/dist/widget.global.js`
22. Ajouter un check CI qui echoue si le bundle widget depasse le budget valide
23. Mesurer le cout d'initialisation du widget sur page externe
24. Mesurer le temps de capture screenshot p50/p95 sur desktop et mobile
25. Ajouter des tests unitaires widget et backend exhaustifs
26. Ajouter des tests cross-browser du widget sur Chromium, Firefox et WebKit
27. Auditer `/`, `/demo`, `/login`, `/projects` et `/settings/*` avec axe automatise
28. Ajouter les tests clavier, contrastes, focus management, mobile 390px et zoom 200%
29. Ajouter un audit log pour changements de destination d'issue
30. Ajouter un audit log pour connexion/deconnexion provider
31. Ajouter un audit log pour invitations et changements de role
32. Ajouter une integration de tracing compatible Next.js
33. Ajouter un dashboard operationnel minimal staging/production
34. Ajouter des alertes sur taux 5xx API
35. Ajouter des alertes sur echecs provider repetes
36. Ajouter des alertes sur feedbacks bloques en `retrying`
37. Ajouter des alertes sur queue bloquee au-dela du SLO
38. Ajouter des alertes sur expiration prochaine des credentials provider
39. Ajouter une collecte de contexte support incluant workspace, site, statut provider et request id
40. Ajouter une page interne de diagnostic par feedback ID avec evenements et issue externe
41. Definir en code une structure de plans commerciaux
42. Ajouter une page pricing publique
43. Ajouter un ecran billing dans les parametres
44. Ajouter etats trial / trial expire / upgrade-downgrade
45. Ajouter une integration paiement pour abonnement SaaS
46. Ajouter un portail client billing

## Logique de tri

- `Urgent` = fuite de donnees, risque prod, persistance, jobs critiques, securite minimale
- `7 jours max` = activation client pilote, Git reel, screenshots propres, support minimum, tests critiques
- `Bonus` = confort, analytics, billing, optimisation, couverture de test exhaustive, echelle avancee
