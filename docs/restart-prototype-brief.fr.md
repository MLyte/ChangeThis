# ChangeThis - Brief prototype "repartir de zero"

## Intention premiere

ChangeThis sert a transformer un retour client vague, fait directement sur un site en cours de livraison, en issue exploitable par une equipe technique.

La promesse du prototype est volontairement simple:

> Le client pointe ce qui doit changer. ChangeThis capture le contexte et route l'issue vers GitHub ou GitLab selon le site.

Mantra produit conserve pour les prochaines iterations editoriales:

> Apprendre des autres, apprendre aux autres.

## Roles cibles

- Client ou reviewer: laisse une note, un pin ou une capture sans compte GitHub/GitLab.
- Freelance ou agence: configure les sites, traite l'inbox et cree les issues.
- Equipe produit: suit les statuts, les erreurs provider et les retries.

## Prototype fonctionnel

- Console produit en premiere vue, pas une landing marketing.
- Demo widget end-to-end sur `/demo`.
- Inbox durable sur `/projects`.
- Configuration serveur obligatoire: chaque site a une destination d'issues GitHub ou GitLab.
- Creation manuelle d'issue avec idempotence, erreurs visibles et retry.
- API de configuration: `GET/POST /api/projects/issue-targets`.
- API feedback publique: `/api/public/feedback`.

## Contrat produit non negociable

Un feedback ne doit pas etre cree sans destination d'issue valide.

Chaque destination contient:

- provider: `github` ou `gitlab`
- namespace
- project
- URL publique du repo ou projet

## Scenario de presentation

1. Ouvrir `/`.
2. Montrer la console ChangeThis et le principe: inbox, sites, providers, retries.
3. Ouvrir `/projects`.
4. Lier un site a GitHub et un autre a GitLab.
5. Ouvrir `/demo` et envoyer un feedback.
6. Revenir a `/projects`.
7. Montrer le feedback persiste, le brouillon d'issue et la destination provider du site.
8. Cliquer sur "Creer l'issue" avec un token provider configure.

## Suite production

- Remplacer le store fichier local par Supabase/Postgres.
- Ajouter auth dashboard et RLS.
- Ajouter stockage objet pour captures.
- Brancher GitHub App/GitLab OAuth en plus des tokens.
- Ajouter detail feedback et historique d'evenements complet.
- Preparer une internationalisation FR/EN sans transformer la console serveur en landing page client-side.
