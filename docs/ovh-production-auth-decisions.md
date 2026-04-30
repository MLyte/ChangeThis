# Decisions et questions pour la mise en production

Date: 2026-04-30

## Decisions deja prises

- Auth production cible: native applicative, pas Supabase Auth.
- Signup public: les inscriptions peuvent etre ouvertes au lancement.
- UX signup cible: e-mail d'abord.
- Premier ecran signup: pas de nom d'organisation, pas de mot de passe.
- Activation: l'utilisateur recoit un e-mail avec lien ou code.
- Premiere connexion: l'utilisateur choisit son mot de passe.
- Hebergement hors OVH accepte si c'est plus simple, moins risque et peu couteux.
- Stack recommandee pour la beta: Railway + PostgreSQL + Brevo.
- Devise de pilotage: euros.
- Budget beta vise: environ 5 a 15 EUR par mois, hors nom de domaine.
- OVH peut rester le registrar du nom de domaine.
- Eviter l'hebergement web OVH classique pour l'application Next.js.

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
2. Ajouter PostgreSQL sur Railway ou connecter Neon Postgres.
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

1. PostgreSQL Railway integre, ou Neon Postgres separe ?
2. Le lien e-mail suffit-il, ou veux-tu aussi un code a 6 chiffres saisissable manuellement ?
3. Le workspace initial doit-il etre mono-organisation par compte, ou l'app doit-elle permettre plusieurs workspaces par utilisateur des le lancement ?
4. La creation d'issue doit-elle rester manuelle par defaut, ou devenir automatique apres reception d'un feedback ?
5. Ou stocke-t-on les screenshots en production: Cloudflare R2, Railway volume temporaire, base de donnees, ou autre ?
6. Quel domaine public sera utilise pour les URLs de callback, le widget et les e-mails ?
7. Quelle duree de session souhaites-tu: 1 jour, 7 jours, 30 jours ?
8. Faut-il limiter le signup public par domaine e-mail ou captcha anti-abus au lancement ?
9. Veux-tu garder OVH comme registrar du domaine, ou migrer aussi le DNS vers Cloudflare ?

## Premiere question active

PostgreSQL Railway integre, ou Neon Postgres separe ?

## Notes de prudence

- L'implementation actuelle email-first ajoutee dans l'app reste compatible avec Supabase Auth. Elle ne constitue pas encore l'auth native applicative cible.
- PostgreSQL seul ne fournit pas d'auth, de magic link, de hash password, ni de sessions.
- Pour une mise en production rapide, la priorite est de livrer un chemin minimal robuste plutot qu'un systeme complet de billing/workspaces multi-org.
