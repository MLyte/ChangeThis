# Deploy Railway + OVH pour `changethis.dev`

Date: 2026-04-30

## Contexte retenu

- Domaine: `changethis.dev`
- Registrar DNS: OVHcloud
- App web Next.js: Railway
- Base de donnees: PostgreSQL integre Railway
- E-mails transactionnels: Brevo
- Domaine app cible: `app.changethis.dev`
- Domaine public marketing cible: `changethis.dev`

`.dev` impose HTTPS. Railway gere le certificat automatiquement des que le DNS est correct.

## Ce qu'il ne faut pas faire

- Ne pas acheter d'hebergement web OVH pour l'application.
- Ne pas pointer le domaine directement vers un ancien mutualise OVH.
- Ne pas configurer les DNS OVH avant d'avoir la cible exacte fournie par Railway.
- Ne pas melanger plusieurs domaines de production dans les variables (`changethis.eu`, `localhost`, etc.).

## Vue d'ensemble

1. Creer le projet Railway.
2. Connecter le repository GitHub.
3. Ajouter PostgreSQL dans Railway.
4. Configurer les variables d'environnement.
5. Declarer `app.changethis.dev` dans Railway.
6. Ajouter les enregistrements DNS dans OVH.
7. Verifier le certificat HTTPS.
8. Basculer `NEXT_PUBLIC_APP_URL` vers le domaine final.

## 1. Creer le projet Railway

Dans Railway:

1. Ouvrir `https://railway.com/`.
2. Creer un compte ou se connecter avec GitHub.
3. Cliquer `New Project`.
4. Choisir `Deploy from GitHub repo`.
5. Autoriser Railway a acceder au repository `ChangeThis` si besoin.
6. Selectionner le repository.

Railway detectera normalement une application Node/Next.js. Si plusieurs services sont proposes, garder un seul service web pour commencer.

## 2. Ajouter PostgreSQL Railway

Dans le projet Railway:

1. Cliquer `New`.
2. Choisir `Database`.
3. Choisir `PostgreSQL`.
4. Laisser Railway creer le service.

Resultat attendu:

- un service applicatif web;
- un service PostgreSQL;
- une variable de connexion disponible cote Railway.

## 3. Variables d'environnement a definir

Dans Railway > service web > `Variables`, preparer au minimum:

```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://app.changethis.dev
AUTH_MODE=supabase
DATA_STORE=file
```

Etat reel du code aujourd'hui:

- le login prod actuel repose encore sur Supabase;
- le store prod complet PostgreSQL n'est pas encore migre;
- la cible architecture finale est bien `auth applicative + PostgreSQL`, mais elle n'est pas encore entierement implemente.

Donc pour un premier deploy technique:

```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://app.changethis.dev
AUTH_MODE=supabase
DATA_STORE=file
```

Et si tu veux brancher les integrations deja existantes:

```env
CHANGETHIS_SECRET_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
GITHUB_APP_SLUG=...
GITHUB_APP_ID=...
GITHUB_APP_PRIVATE_KEY=...
GITHUB_WEBHOOK_SECRET=...
GITLAB_OAUTH_APP_ID=...
GITLAB_OAUTH_APP_SECRET=...
GITLAB_WEBHOOK_SECRET=...
```

Ne mets pas encore Brevo tant que le flux applicatif natif e-mail n'est pas branche dans le code.

## 4. Build et start Railway

Railway detecte souvent automatiquement Next.js. Si Railway demande des commandes explicites:

- Build command: `npm run build`
- Start command: `npm run start --workspace @changethis/web`

Si le monorepo demande d'abord un build shared, utiliser:

- Build command: `npm run build`
- Start command: `npm run start --workspace @changethis/web`

Le repository contient deja les scripts npm du monorepo, donc il faut privilegier les scripts racine plutot que des commandes manuelles custom.

## 5. Domaine custom dans Railway

Quand le service web est deploye:

1. Ouvrir le service web.
2. Aller dans `Settings`.
3. Ouvrir `Domains`.
4. Ajouter `app.changethis.dev`.

Railway affichera alors une cible DNS a creer chez OVH. En pratique ce sera souvent:

- soit un `CNAME` vers un hostname Railway;
- soit exceptionnellement une autre cible indiquee par Railway.

Tant que cette cible n'est pas visible, ne touche pas au DNS OVH.

## 6. DNS OVH a creer

Dans OVH Manager:

1. Aller dans `Web Cloud`.
2. Ouvrir le domaine `changethis.dev`.
3. Aller dans `Zone DNS`.
4. Ajouter l'entree demandee par Railway.

Cas le plus probable:

Pour `app.changethis.dev`

- Type: `CNAME`
- Sous-domaine: `app`
- Cible: valeur fournie par Railway

Pour la vitrine `changethis.dev`, deux options:

- soit la laisser plus tard;
- soit la faire pointer plus tard vers Vercel/Railway selon le site marketing choisi.

Je recommande de commencer uniquement par `app.changethis.dev`, pour reduire les erreurs DNS.

## 7. HTTPS et verification

Apres propagation DNS:

1. Revenir dans Railway > `Domains`.
2. Verifier que `app.changethis.dev` passe en statut valide.
3. Attendre le certificat HTTPS.
4. Ouvrir `https://app.changethis.dev`.

Si le certificat n'apparait pas encore:

- attendre la propagation DNS;
- verifier que l'entree OVH est exactement celle demandee par Railway;
- ne pas ajouter un `A record` concurrent sur `app`.

## 8. Brevo

Brevo ne sert pas encore au deploy technique de base. Il servira quand le flux e-mail applicatif natif sera branche.

Quand on y sera:

1. Creer un compte Brevo.
2. Verifier le domaine expediteur `changethis.dev` ou un sous-domaine mail dedie.
3. Ajouter les DNS DKIM/SPF demandes par Brevo dans OVH.
4. Definir:

```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=...
SMTP_PASSWORD=...
SMTP_FROM=ChangeThis <noreply@changethis.dev>
```

## 9. Decision technique importante

Le domaine de production est maintenant fixe:

- app: `https://app.changethis.dev`

Mais la pile production n'est pas encore entierement alignee sur Railway + PostgreSQL.

Etat actuel:

- domaine: pret;
- hebergement Railway: pret a etre configure;
- PostgreSQL Railway: choix valide;
- auth applicative PostgreSQL: pas encore implementee;
- store feedback PostgreSQL: pas encore implemente;
- deploy technique possible des maintenant;
- ouverture publique commerciale: pas encore saine sans les taches data/auth restantes.

## 10. Checklist execution

Quand tu executes le deploy:

- creer le projet Railway;
- connecter GitHub;
- ajouter PostgreSQL;
- renseigner les variables d'environnement;
- lancer le premier deploy;
- ajouter `app.changethis.dev` dans Railway;
- recopier la cible DNS dans OVH;
- attendre HTTPS;
- verifier la page de login sur `https://app.changethis.dev`.

## 11. Suite logique dans le code

Les prochaines vraies taches produit/infra pour rendre cette prod credible sont:

1. filtrer toutes les lectures par workspace;
2. migrer les feedbacks vers PostgreSQL;
3. migrer les projets/sites vers PostgreSQL;
4. remplacer la dependance production au store fichier;
5. finaliser le flux signup/login cible.

## Reponse courte a suivre

Si tu veux aller vite sans casser la suite:

- OVH garde le domaine;
- Railway heberge l'app;
- Railway heberge PostgreSQL;
- OVH DNS pointe `app.changethis.dev` vers Railway;
- Brevo arrive juste apres, quand on branche l'e-mail natif.
