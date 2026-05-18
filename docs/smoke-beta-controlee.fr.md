# Smoke beta controlee

Etat actuel: voir [current-state.fr.md](current-state.fr.md).

Objectif: verifier apres deploy que la beta ouverte controlee reste exploitable de bout en bout, avec Supabase en production et sans utiliser le store fichier.

## Perimetre

- Application beta deployee, par defaut `https://app.changethis.dev`.
- `AUTH_MODE=supabase`, `DATA_STORE=supabase`; `ENABLE_PUBLIC_SIGNUP=false` uniquement si les inscriptions doivent etre temporairement en pause.
- Widget public servi par `/widget.js` et `/widget.global.js`.
- Un site connecte de smoke avec origine autorisee et cle publique projet.
- Creation d'issue GitHub ou GitLab declenchee manuellement depuis `/projects`.

## Gates avant smoke manuel

Depuis un environnement qui contient les variables beta:

```bash
npm run prod:check
npm run smoke:widget -- --base-url https://app.changethis.dev
```

Le premier check valide les variables, les migrations attendues et le typecheck. Le second check verifie `/api/health`, `/api/ready`, `/widget.js` et `/widget.global.js`.

Pour verifier aussi le CORS public du site de smoke:

```bash
npm run smoke:widget -- --base-url https://app.changethis.dev --project-key PROJECT_PUBLIC_KEY --origin https://smoke.example
```

Pour envoyer un vrai feedback de smoke dans l'inbox, ajouter explicitement `--send`:

```bash
npm run smoke:widget -- --base-url https://app.changethis.dev --project-key PROJECT_PUBLIC_KEY --origin https://smoke.example --send
```

## Page externe widget

Utiliser [widget-external-smoke.html](widget-external-smoke.html) comme page hote hors application ChangeThis.

1. Servir cette page depuis l'origine exacte configuree sur le site connecte, par exemple `https://smoke.example`.
2. Ouvrir la page avec les parametres:

```text
https://smoke.example/widget-external-smoke.html?app=https%3A%2F%2Fapp.changethis.dev&project=PROJECT_PUBLIC_KEY&locale=fr
```

3. Verifier que le bouton `Feedback` apparait.
4. Envoyer un commentaire court: `Smoke beta widget externe`.
5. Ouvrir `/projects` dans ChangeThis.
6. Verifier que le feedback arrive sur le bon site avec le bon chemin.
7. Creer manuellement l'issue externe depuis l'inbox.
8. Verifier que l'issue existe dans le depot cible et que le statut passe a `sent_to_provider`.

## Checklist staging

- [ ] `npm run prod:check` vert avec les variables staging.
- [ ] `npm run smoke:widget -- --base-url STAGING_URL` vert.
- [ ] `/api/health` retourne `200`.
- [ ] `/api/ready` retourne `200`.
- [ ] Signup public dans l'etat attendu pour l'environnement (`true` si beta ouverte, `false` si pause operationnelle).
- [ ] Site de smoke cree avec origine exacte de la page externe.
- [ ] Widget visible sur la page externe.
- [ ] Feedback test visible dans `/projects`.
- [ ] Issue GitHub/GitLab creee manuellement depuis le feedback.
- [ ] Screenshot accepte uniquement comme fonctionnalite beta connue; stockage objet final non bloque pour beta ouverte controlee.

## Checklist production

- [ ] Migrations Supabase appliquees avant deploy.
- [ ] Migrations `supabase/migrations/0001_*.sql` a `0009_*.sql` appliquees.
- [ ] `AUTH_MODE=supabase`, `DATA_STORE=supabase`, signup ouvert ou `ENABLE_PUBLIC_SIGNUP=false` volontairement choisi pour une pause.
- [ ] `npm run prod:check` vert avec les variables production.
- [ ] `npm run smoke:widget -- --base-url https://app.changethis.dev` vert.
- [ ] `npm run smoke:widget -- --base-url https://app.changethis.dev --project-key PROJECT_PUBLIC_KEY --origin ORIGIN_AUTORISEE` vert.
- [ ] Un feedback reel envoye depuis la page externe arrive dans `/projects`.
- [ ] Une issue reelle est creee manuellement dans le bon depot pilote.
- [ ] Aucun secret n'est expose dans le snippet widget, les logs ou la page de smoke.
- [ ] No-go si `/api/ready` echoue, si le store est `file`, si l'origine est refusee, ou si le feedback n'apparait pas dans l'inbox.

## Notes connues

- La page `/demo` reste un bac a sable widget, pas une preuve d'installation client externe.
- Le rate limit public reste en memoire et n'est pas encore ideal pour du multi-instance.
- Les screenshots restent transitoirement stockes en data URL tant que Supabase Storage ou un stockage objet n'est pas branche.
