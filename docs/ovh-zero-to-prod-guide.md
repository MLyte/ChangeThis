# OVH: partir de zero vers une prod ChangeThis

Date: 2026-04-30

## Constat depuis le manager OVH

La capture montre un hebergement web OVH `Starter` avec:

- PHP global 5.4;
- base de donnees `0/1`;
- Web Cloud Databases `0`;
- pas de service Node.js visible dans cet ecran;
- pas encore de domaine applicatif configure pour ChangeThis.

Ce service peut servir pour un site PHP/statique ou une petite base incluse, mais ce n'est pas le bon socle principal pour ChangeThis.

ChangeThis est une application Next.js serveur avec API, sessions, GitHub/GitLab, widget public, jobs/retries et stockage de feedbacks. Il faut donc une architecture separant application, base, e-mail et stockage.

## Recommandation courte

Pour aller vite et proprement:

- App Next.js: VPS OVH Ubuntu ou Public Cloud Instance OVH.
- Base: PostgreSQL.
- Auth: OVH native applicative, stockee dans PostgreSQL.
- E-mails signup/login: SMTP OVH au depart, ou Brevo/Resend si delivrabilite plus simple.
- Screenshots: OVH Object Storage plus tard; temporairement, ne pas mettre de gros screenshots en base.
- Domaine: pointer vers le serveur applicatif, pas vers l'hebergement mutualise actuel.

## Ce qu'il faut eviter

- Ne pas baser ChangeThis sur l'hebergement web `Starter` actuel.
- Ne pas utiliser PHP 5.4.
- Ne pas stocker durablement les screenshots en data URL dans une base mutualisee.
- Ne pas confondre "base incluse dans l'hebergement web" avec "base production applicative".
- Ne pas garder `DATA_STORE=file` en production.
- Ne pas garder Supabase Auth si la decision produit est "OVH native".

## Choix de base recommande

### Option A - Recommandee: PostgreSQL managé OVH Public Cloud Databases

Avantages:

- backups et maintenance geres par OVH;
- adapte a une application SaaS;
- PostgreSQL est le meilleur choix pour les tables auth, workspaces, feedbacks, events et integrations;
- moins de maintenance qu'une base installee a la main sur VPS.

Dans OVH Manager:

1. Aller dans `Public Cloud`.
2. Creer un projet Public Cloud si aucun projet n'existe.
3. Aller dans `Databases`.
4. Choisir `PostgreSQL`.
5. Choisir une region proche des utilisateurs et du serveur app.
6. Creer un utilisateur admin dedie.
7. Noter:
   - host;
   - port;
   - database;
   - username;
   - password;
   - SSL mode requis.
8. Autoriser l'IP du serveur applicatif dans les connexions entrantes.

### Option B - Plus simple a acheter, plus de maintenance: PostgreSQL sur VPS

Avantages:

- moins de produits OVH a comprendre;
- tout est sur un serveur;
- pratique pour un premier lancement controle.

Inconvenients:

- backups, securite, mises a jour et restauration sont a ta charge;
- plus risque si le VPS tombe;
- moins propre pour un SaaS.

Dans OVH Manager:

1. Aller dans `Bare Metal Cloud` ou `Public Cloud`.
2. Creer un VPS Ubuntu LTS.
3. Se connecter en SSH.
4. Installer Node.js, PostgreSQL, Nginx, Certbot.
5. Creer la base ChangeThis localement sur le VPS.

## Recommendation finale pour toi

Si tu veux une prod en 2 jours: prends un VPS Ubuntu + PostgreSQL local seulement si tu acceptes une beta technique.

Si tu veux une base plus saine pour vendre: prends PostgreSQL managé OVH Public Cloud Databases.

Vu que l'objectif est "auth OVH native publique", je recommande:

- VPS Ubuntu pour l'app;
- PostgreSQL managé OVH pour la DB;
- SMTP OVH ou Brevo pour les e-mails.

## Architecture cible minimale

```text
Navigateur client
  -> https://app.ton-domaine.be
  -> VPS / Public Cloud Instance OVH
  -> Next.js ChangeThis
  -> PostgreSQL OVH
  -> SMTP pour e-mails signup/login
  -> GitHub/GitLab APIs
```

## Etapes OVH detaillees

### 1. Acheter ou creer le serveur applicatif

Dans OVH Manager:

1. Aller dans `Bare Metal Cloud` > `VPS` ou `Public Cloud` > `Instances`.
2. Choisir Ubuntu LTS.
3. Choisir une taille minimale realiste:
   - 2 vCPU;
   - 4 Go RAM;
   - 40 Go disque.
4. Ajouter une cle SSH si OVH le propose.
5. Attendre l'e-mail de livraison.

Sur Windows:

```powershell
ssh ubuntu@IP_DU_SERVEUR
```

### 2. Securiser le serveur

Sur le serveur:

```bash
sudo apt update
sudo apt upgrade
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

Installer les outils de base:

```bash
sudo apt install git curl nginx certbot python3-certbot-nginx
```

### 3. Installer Node.js

Utiliser une version LTS compatible Next.js.

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install nodejs
node -v
npm -v
```

### 4. Creer la base PostgreSQL

#### Si PostgreSQL managé OVH

Dans OVH Manager:

1. Aller dans `Public Cloud` > `Databases`.
2. Creer un service PostgreSQL.
3. Creer une base `changethis`.
4. Creer un user applicatif `changethis_app`.
5. Autoriser l'IP publique du VPS.
6. Recuperer l'URL de connexion.

Variable attendue cote app:

```env
DATABASE_URL=postgresql://changethis_app:PASSWORD@HOST:PORT/changethis?sslmode=require
```

#### Si PostgreSQL sur VPS

```bash
sudo apt install postgresql postgresql-contrib
sudo -u postgres psql
```

Dans `psql`:

```sql
CREATE USER changethis_app WITH PASSWORD 'CHANGE_ME_LONG_PASSWORD';
CREATE DATABASE changethis OWNER changethis_app;
\q
```

Variable attendue:

```env
DATABASE_URL=postgresql://changethis_app:CHANGE_ME_LONG_PASSWORD@localhost:5432/changethis
```

### 5. Configurer les e-mails

Minimum pour l'auth publique:

```env
SMTP_HOST=ssl0.ovh.net
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=adresse@ton-domaine.be
SMTP_PASSWORD=mot_de_passe_mail
SMTP_FROM="ChangeThis <adresse@ton-domaine.be>"
```

Si la delivrabilite OVH est mauvaise, utiliser Brevo ou Resend.

### 6. Configurer l'application

Variables de production a viser:

```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://app.ton-domaine.be
AUTH_MODE=ovh
DATA_STORE=postgres
DATABASE_URL=postgresql://...
CHANGETHIS_SECRET_KEY=une_valeur_longue_aleatoire
SMTP_HOST=...
SMTP_PORT=...
SMTP_SECURE=true
SMTP_USER=...
SMTP_PASSWORD=...
SMTP_FROM=...
GITHUB_APP_SLUG=...
GITHUB_APP_ID=...
GITHUB_APP_PRIVATE_KEY=...
GITHUB_WEBHOOK_SECRET=...
GITLAB_OAUTH_APP_ID=...
GITLAB_OAUTH_APP_SECRET=...
GITLAB_WEBHOOK_SECRET=...
```

Important: `AUTH_MODE=ovh` et `DATA_STORE=postgres` ne sont pas encore implementes dans le code. Ce guide fixe la cible.

### 7. Auth native OVH a implementer dans le code

Tables minimales:

```sql
CREATE TABLE users (
  id uuid PRIMARY KEY,
  email text UNIQUE NOT NULL,
  password_hash text,
  email_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE email_tokens (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  purpose text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE organizations (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES users(id),
  plan text NOT NULL DEFAULT 'free',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE workspace_members (
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);
```

Flux signup:

1. L'utilisateur saisit son e-mail.
2. Le serveur cree ou retrouve `users.email`.
3. Le serveur cree un token aleatoire, stocke seulement son hash dans `email_tokens`.
4. Le serveur envoie un lien:

```text
https://app.ton-domaine.be/signup/verify?token=TOKEN
```

5. Le lien valide le token, marque `email_verified_at`, pose une session temporaire.
6. L'utilisateur choisit son mot de passe.
7. Le serveur hash le mot de passe.
8. Le serveur cree l'organisation automatiquement.
9. Redirection vers l'onboarding du premier site.

### 8. Domaine et SSL

Dans OVH:

1. Creer un sous-domaine, par exemple `app.ton-domaine.be`.
2. Ajouter un enregistrement DNS `A` vers l'IP du VPS.
3. Sur le VPS, configurer Nginx comme reverse proxy vers Next.js.
4. Activer Let's Encrypt:

```bash
sudo certbot --nginx -d app.ton-domaine.be
```

### 9. Deployment de l'app

Exemple simple:

```bash
git clone https://github.com/MLyte/ChangeThis.git
cd ChangeThis
npm install
npm run build
npm run start
```

Pour la prod, utiliser `pm2` ou un service systemd.

```bash
sudo npm install -g pm2
pm2 start npm --name changethis -- run start
pm2 save
pm2 startup
```

### 10. Go / no-go avant ouverture publique

Bloquant:

- signup email-first fonctionne;
- e-mail recu;
- lien expire correctement;
- token usage unique;
- mot de passe hash;
- session httpOnly;
- logout supprime la session;
- workspace cree apres verification e-mail;
- feedbacks stockes en base, pas en fichier local;
- mode local bloque en production;
- `NEXT_PUBLIC_APP_URL` correct;
- GitHub/GitLab callbacks utilisent le domaine final;
- sauvegarde base configuree.

## Decision immediate

Comme tu pars de zero, la question "quel moteur OVH ?" peut devenir une decision d'architecture.

Je recommande: PostgreSQL.

Question suivante a valider:

Veux-tu que je parte sur `PostgreSQL managé OVH Public Cloud Databases` ou sur `PostgreSQL installe sur un VPS OVH` ?

## Sources OVH utiles

- Creation d'une base sur hebergement web OVH: https://help.ovhcloud.com/csm/en-gb-web-hosting-creating-database?id=kb_article_view&sysparm_article=KB0053062
- Web Cloud Databases, creation bases et users: https://help.ovhcloud.com/csm/en-ca-web-cloud-db-create-databases-users?id=kb_article_view&sysparm_article=KB0056685
- Public Cloud Databases PostgreSQL: https://help.ovhcloud.com/csm/en-ca-documentation-public-cloud-databases-postgresql-getting-started?id=kb_browse_cat&kb_category=412c11fd2caafa1c4a4e082b79ed2fc4&kb_id=574a8325551974502d4c6e78b7421938
- Demarrer avec un VPS OVH: https://help.ovhcloud.com/csm/en-au-vps-getting-started?id=kb_article_view&sysparm_article=KB0047717
- Securiser un VPS OVH: https://help.ovhcloud.com/csm/en-gb-vps-security-tips?id=kb_article_view&sysparm_article=KB0047706
