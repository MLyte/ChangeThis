# Decisions et questions pour la mise en production

Date: 2026-04-30

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

- Auth production cible a terme: native applicative, pas Supabase Auth.
- UX signup cible: e-mail d'abord.
- Premier ecran signup: pas de nom d'organisation, pas de mot de passe.
- Activation: l'utilisateur recoit un e-mail avec lien securise, avec code court possible en fallback.
- Premiere connexion: l'utilisateur choisit son mot de passe.
- Hebergement hors OVH accepte si c'est plus simple, moins risque et peu couteux.
- Stack recommandee pour la beta: Railway + PostgreSQL + Brevo.
- Moteur de base de donnees valide: PostgreSQL.
- Fournisseur PostgreSQL beta: Railway integre.
- Stockage screenshots production retenu: Cloudflare R2.
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

1. Creer le projet Railway.
2. Ajouter une base PostgreSQL integree a Railway.
3. Ajouter les migrations auth minimales.
4. Ajouter le provider e-mail Brevo.
5. Implementer le signup e-mail-first natif applicatif.
6. Implementer la verification du lien/code e-mail.
7. Implementer le choix du mot de passe a la premiere connexion.
8. Implementer les sessions applicatives.
9. Adapter `getCurrentSession` pour lire les sessions PostgreSQL.
10. Creer automatiquement le workspace apres verification e-mail.
11. Garder le login password comme fallback simple.
12. Bloquer le mode local et les stores fichier en production.

## Questions restantes a poser une par une

Aucune a ce stade.

## Premiere question active

Aucune a ce stade.

## Notes de prudence

- L'implementation actuelle email-first ajoutee dans l'app reste compatible avec Supabase Auth. Elle ne constitue pas encore l'auth native applicative cible.
- PostgreSQL seul ne fournit pas d'auth, de magic link, de hash password, ni de sessions.
- Pour une mise en production rapide, la priorite est de livrer un chemin minimal robuste plutot qu'un systeme complet de billing/workspaces multi-org.
- L'app actuellement en ligne est un etat beta transitoire: Railway + domaine reel + PostgreSQL cree, mais auth encore Supabase et certains flux prod restent a finaliser.
