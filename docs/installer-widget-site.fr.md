# Installer le widget sur un site

Etat actuel: voir [current-state.fr.md](current-state.fr.md).

Ce guide explique comment installer le widget ChangeThis sur un site client, en staging ou en production.

## Pré-requis

- Un accès `admin` ou `owner` au workspace ChangeThis.
- Un site créé dans `/settings/connected-sites`.
- Une origine autorisée configurée pour ce site, par exemple `https://client.example`.
- Une clé publique de projet générée par ChangeThis.

La clé utilisée dans le widget est publique. Elle identifie le site côté navigateur, mais elle ne remplace pas la validation d'origine faite par l'API.

## 1. Créer ou vérifier le site connecté

Dans ChangeThis, ouvrir `/settings/connected-sites`, puis vérifier que le site contient :

- un nom lisible ;
- l'origine exacte du site qui chargera le widget ;
- une destination GitHub ou GitLab si les feedbacks doivent devenir des issues ;
- le snippet d'installation généré.

L'origine autorisée doit correspondre à `window.location.origin` sur le site client. Par exemple :

| URL visitée | Origine à configurer |
|---|---|
| `https://client.example/page` | `https://client.example` |
| `https://www.client.example/a-propos` | `https://www.client.example` |
| `http://localhost:5173/test` | `http://localhost:5173` |

Ne pas mélanger `http` et `https`, ni domaine racine et sous-domaine `www`.

## 2. Ajouter le snippet au site

Coller le script juste avant `</body>` dans le layout global du site :

```html
<script src="https://app.changethis.dev/widget.js" data-project="project_public_key"></script>
```

Remplacer `project_public_key` par la clé publique fournie dans `/settings/connected-sites`.

Le widget lit `data-project` pour identifier le site lors de l'envoi du feedback. Les options visibles du widget viennent aujourd'hui des attributs du script (`data-locale`, `data-position`, `data-button-variant`, `data-endpoint`) plutôt que d'un fetch automatique de `/api/widget/config`. Sans `data-project`, ou avec une clé d'un autre site, le feedback sera refusé.

## 3. Local vs production

En production ou staging client, utiliser l'URL de l'application ChangeThis déployée :

```html
<script src="https://app.changethis.dev/widget.js" data-project="project_public_key"></script>
```

En développement local ChangeThis, utiliser le serveur web local :

```html
<script src="http://localhost:3000/widget.js" data-project="project_public_key"></script>
```

Si Next.js démarre sur un autre port, remplacer `3000` par le port affiché par `npm run dev`.

Pour tester un site client lancé en local, ajouter son origine locale dans le site connecté, par exemple `http://localhost:5173`.

## 4. Test rapide

1. Ouvrir la page du site où le snippet est installé.
2. Vérifier que le bouton `Feedback` apparaît.
3. Envoyer un commentaire court, par exemple `Test installation widget`.
4. Revenir dans `/projects`.
5. Vérifier que le feedback apparaît dans l'inbox avec le bon site.

Depuis `/settings/connected-sites`, utiliser aussi le test d'installation du script quand l'URL du site est accessible publiquement. Ce test vérifie que la page HTML contient `/widget.js` avec le bon `data-project`.

En local ChangeThis pur, `/demo` reste le smoke test le plus simple : la page charge le widget local et envoie un feedback vers l'API locale.

## Erreurs fréquentes

### Le bouton Feedback ne s'affiche pas

- Vérifier que le snippet est présent dans le HTML final de la page.
- Vérifier que `https://app.changethis.dev/widget.js` ou `http://localhost:3000/widget.js` répond bien.
- Vérifier qu'un bloqueur de script ou une règle CSP du site ne bloque pas le domaine ChangeThis.

### L'envoi échoue avec `Origin is not allowed for this project`

- Comparer l'origine configurée dans ChangeThis avec `window.location.origin` sur le site.
- Corriger les différences `http`/`https`, `www`/sans `www`, port local ou sous-domaine.
- Vérifier que la clé `data-project` appartient bien au site connecté concerné.

### Le test d'installation indique `script_missing`

- Le script n'est pas visible dans le HTML de l'URL configurée.
- Installer le snippet dans le layout commun, pas seulement sur une page non visitée par le test.
- Si le site injecte le script côté client après chargement, le test serveur peut ne pas le voir ; valider alors manuellement dans le navigateur.

### Le test indique `project_key_mismatch`

- Un script ChangeThis est présent, mais son `data-project` ne correspond pas à ce site.
- Recopier le snippet depuis `/settings/connected-sites` pour éviter une ancienne clé.

### Le feedback arrive, mais l'issue n'est pas créée

- Vérifier la connexion Git dans `/settings/git-connections`.
- Vérifier que le dépôt cible est configuré sur le site connecté.
- Vérifier les permissions GitHub ou GitLab sur le dépôt.
- En beta actuelle, la création d'issue est déclenchée manuellement depuis `/projects`; elle n'est pas automatique après l'envoi du feedback.
