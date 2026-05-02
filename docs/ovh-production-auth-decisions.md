# Decisions et questions pour la mise en production

Date: 2026-04-30

Mise a jour 2026-05-02: ce document est historique pour la cible OVH/auth native. Le chemin beta actuellement implemente est Railway pour l'app, Supabase Auth/DB avec `AUTH_MODE=supabase` + `DATA_STORE=supabase`, et OVH pour DNS. Le code actuel ne consomme pas `DATABASE_URL`.

Etat actuel beta: voir [current-state.fr.md](current-state.fr.md).

## Etat actuel deploye

- Domaine principal retenu: `changethis.dev`.
- Domaine applicatif cible: `app.changethis.dev`.
- DNS OVH et domaine custom Railway relies et actifs.
- Application Next.js en ligne sur Railway.
- Base PostgreSQL Railway creee.
- Auth runtime actuellement en production: Supabase Auth.
- Signup public actuellement ferme en beta privee (`ENABLE_PUBLIC_SIGNUP=false`).
- `/login` et `/signup` affichent un etat beta privee cote UI.
- `/signup` doit rester ferme proprement tant que la beta privee continue.

## Decisions deja prises

- Auth production cible a terme: native applicative, pas Supabase Auth. Cette cible n'est pas le chemin beta actuel.
- UX signup cible: e-mail d'abord.
- Premier ecran signup: pas de nom d'organisation, pas de mot de passe.
- Activation: l'utilisateur recoit un e-mail avec lien securise, avec code court possible en fallback.
- Premiere connexion: l'utilisateur choisit son mot de passe.
- Hebergement hors OVH accepte si c'est plus simple, moins risque et peu couteux.
- Stack recommandee pour la beta actuelle: Railway app + Supabase Auth/DB + OVH DNS.
- Moteur de base de donnees valide: PostgreSQL.
- Fournisseur PostgreSQL beta actuel: Supabase Postgres via REST/service role.
- Railway PostgreSQL integre: non consomme par le code actuel.
- Stockage screenshots production cible: objet prive type Cloudflare R2 ou Supabase Storage; non implemente actuellement.
- Duree de session cible retenue: 7 jours.
- Pendant la beta: signup public ferme.
- A la reouverture du signup public: lien e-mail obligatoire + captcha anti-abus + rate limit.
- Registrar et DNS retenus pour l'instant: OVH.
- Devise de pilotage: euros.
- Budget beta vise: environ 5 a 15 EUR par mois, hors nom de domaine.
- OVH peut rester le registrar du nom de domaine.
- Eviter l'hebergement web OVH classique pour l'application Next.js.
- Workspace initial: mono-workspace cree automatiquement par compte au lancement.
- Creation d'issue: validation manuelle par defaut depuis l'inbox, avec action par lot pour les feedbacks selectionnes.
- Regle de decision IA: si un choix est raisonnablement evident pour la beta avec environ 70% de confiance, l'agent tranche et documente au lieu de demander validation.

## Decisions a revalider plus tard

- Moment exact de reouverture du signup public.

## Consequence technique

L'application ne doit pas seulement changer le formulaire de signup.

Il faut remplacer progressivement la dependance Supabase Auth par une auth applicative:

- table utilisateurs dans PostgreSQL;
- table tokens e-mail a usage unique;
- table sessions;
- hash de mot de passe cote serveur;
- cookies httpOnly;
- envoi e-mail via Brevo au depart;
- verification expiration/usage unique des liens ou codes;
- creation du workspace apres verification de l'e-mail.

## Ordre d'implementation recommande

1. Pour la beta actuelle: Railway app + Supabase Auth/DB + migrations `0001` a `0007`.
2. Valider `npm run prod:check`, `/api/health`, `/api/ready`.
3. Faire un smoke reel `widget -> inbox -> issue`.
4. Ensuite seulement, planifier l'eventuelle auth native applicative:
   - tables utilisateurs/sessions/tokens;
   - hash password;
   - e-mail via Brevo;
   - adaptation `getCurrentSession`;
   - migration hors Supabase Auth.
5. Bloquer le mode local et les stores fichier en production.

## Questions restantes a poser une par une

Aucune a ce stade.

## Premiere question active

Aucune a ce stade.

## Notes de prudence

- L'implementation actuelle email-first reste compatible avec Supabase Auth. Elle ne constitue pas encore l'auth native applicative cible.
- PostgreSQL seul ne fournit pas d'auth, de magic link, de hash password, ni de sessions.
- Pour une mise en production rapide, la priorite est de livrer un chemin minimal robuste plutot qu'un systeme complet de billing/workspaces multi-org.
- L'app beta cible est un etat transitoire volontaire: Railway + domaine reel + Supabase Auth/DB. Certains flux prod restent a finaliser, notamment screenshots objet, rate limit partage, idempotence provider et backup/restore.
