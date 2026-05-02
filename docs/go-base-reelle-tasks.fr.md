# Go base reelle - repartition des taches

Etat actuel: voir [current-state.fr.md](current-state.fr.md).

Objectif: passer `app.changethis.dev` d'une beta simulee/local-file a une beta connectee a une vraie base PostgreSQL, avec auth reelle, donnees persistantes et smoke tests de bout en bout.

## Decisions a confirmer avant execution

- Hebergeur applicatif: Railway reste le chemin recommande pour la beta.
- Base de donnees beta: Supabase Postgres via API REST/service role, car le code actuel ne consomme pas `DATABASE_URL`.
- Auth: `AUTH_MODE=supabase` pour le chemin beta actuel; une auth applicative native séparée serait un chantier dédié.
- Store applicatif: `DATA_STORE=supabase`.
- Domaine cible: `https://app.changethis.dev`.
- Beta: invitation-only, inscriptions publiques fermees tant que `ENABLE_PUBLIC_SIGNUP=false`.

## Taches cote utilisateur

### 1. Choisir et creer les services

- [ ] Confirmer le choix beta actuel recommande: Railway pour l'app, Supabase pour auth + DB, OVH pour DNS.
- [ ] Noter explicitement que Railway PostgreSQL natif, `DATABASE_URL`, `AUTH_MODE=ovh` et `DATA_STORE=postgres` sont des chantiers futurs non supportes par le code actuel.
- [ ] Creer le projet/service de base retenu.
- [ ] Creer ou verifier le service web Railway qui deploie l'app Next.js.
- [ ] Verifier que le domaine `app.changethis.dev` pointe vers le service web.
- [ ] Garder les secrets dans le dashboard du provider, jamais dans Git.

### 2. Fournir les secrets et variables

- [ ] Recuperer l'URL publique de l'app: `NEXT_PUBLIC_APP_URL=https://app.changethis.dev`.
- [ ] Recuperer les variables Supabase si Supabase est retenu:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Generer les secrets applicatifs:
  - `CHANGETHIS_SECRET_KEY`
  - secret de session/auth si le mode retenu en exige un
  - secrets OAuth GitHub/GitLab si les connexions provider doivent etre testees en prod
- [ ] Configurer les variables de mode:
  - `AUTH_MODE=supabase`
  - `DATA_STORE=supabase`
  - `ENABLE_PUBLIC_SIGNUP=false`
  - `SUPABASE_REST_TIMEOUT_MS=10000`
- [ ] Configurer le SMTP ou le provider mail d'auth si les liens signup/login doivent partir par email.

### 3. Actions manuelles de production

- [ ] Coller les variables dans Railway, Vercel ou le provider de deploiement retenu.
- [ ] Declencher un redeploiement propre apres ajout des variables.
- [ ] Me donner les erreurs de build/runtime si le deploiement echoue.
- [ ] Creer le premier compte beta avec une adresse email controlee.
- [ ] Valider la reception des emails d'auth si le flux email est actif.
- [ ] Me confirmer quand l'app prod est accessible sur `https://app.changethis.dev`.

## Taches cote IA

### 1. Audit pre-Go

- [ ] Relire les migrations `supabase/migrations/*.sql` dans l'ordre.
- [ ] Verifier que les migrations couvrent bien workspaces, membres, projets/sites, public keys, feedbacks, events, issue targets et provider integrations.
- [ ] Identifier les colonnes encore transitoires ou non ideales en prod, notamment screenshots en data URL.
- [ ] Verifier que `AUTH_MODE=supabase` et `DATA_STORE=supabase` activent bien les chemins prod attendus.
- [ ] Verifier que le fallback local/demo ne fuit pas en mode Supabase.
- [ ] Produire la liste finale des variables obligatoires, optionnelles et interdites en prod.

### 2. Garde-fous code avant deploiement

- [x] Ajouter ou renforcer les checks de readiness pour signaler les variables prod manquantes.
- [x] S'assurer que `/api/ready` echoue clairement si la base ou les secrets critiques manquent.
- [x] Ajouter un check structurel des migrations Supabase: `npm run migrations:check`.
- [x] Ajouter un gate prod local: `npm run prod:check`.
- [ ] Verifier que les routes publiques refusent les origines non autorisees.
- [ ] Verifier que les credentials Git sont chiffres avant stockage.
- [ ] Verifier que les erreurs prod ne loggent pas de secrets.
- [ ] Ajouter un smoke test minimal si un chemin critique n'est pas couvert.

### 3. Execution migrations et validation

- [ ] Fournir la commande exacte pour appliquer les migrations selon le provider retenu.
- [ ] Si possible, tester les migrations sur une base temporaire ou locale avant prod.
- [ ] Verifier l'ordre d'application `0001` -> `0007`.
- [ ] Verifier qu'un redeploiement avec `DATA_STORE=supabase` demarre sans fallback silencieux.
- [ ] Valider les endpoints `GET /api/health` et `GET /api/ready`.

### 4. Smoke test beta connectee

- [ ] Tester login/signup selon le mode retenu.
- [ ] Tester creation automatique ou manuelle du workspace initial.
- [ ] Tester creation d'un site connecte avec domaine autorise.
- [ ] Tester chargement du widget public sur `/demo` ou une page externe.
- [ ] Envoyer un feedback reel via widget.
- [ ] Verifier que le feedback apparait dans `/projects`.
- [ ] Configurer une destination GitHub ou GitLab.
- [ ] Tester la creation manuelle d'une issue depuis un feedback.
- [ ] Tester le logout/login et la persistance des donnees.

## Ordre recommande

1. Confirmer le choix de stack base/auth.
2. Audit IA des migrations et variables.
3. Creation utilisateur des services et secrets.
4. Patch IA des garde-fous manquants.
5. Application migrations.
6. Deploiement avec variables prod.
7. Smoke test complet.
8. Correction des blocages.
9. Gel beta: noter les limites connues et les runbooks minimaux.

## Definition de fini

- `https://app.changethis.dev` demarre sans fallback fichier local.
- `/api/health` et `/api/ready` sont verts.
- Un compte beta peut se connecter.
- Un workspace et un site existent en base.
- Le widget peut envoyer un feedback.
- Le dashboard affiche le feedback depuis la base.
- Une issue Git peut etre creee ou, si le provider n'est pas encore active, l'echec est clair et actionnable.
- Les secrets ne sont ni commites ni exposes dans les logs.

## Blocages probables a anticiper

- Mail d'auth non configure ou delivrabilite faible.
- Variables Supabase/Railway incompletes.
- Migrations incompatibles avec l'etat reel de la base.
- Screenshots encore stockes en data URL, acceptable seulement en beta courte.
- Connexion GitHub/GitLab pas encore entierement workspace-backed selon le flux choisi.
- Domaine ou CORS mal configure pour `app.changethis.dev`.
