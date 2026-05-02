# Démarrage rapide client ChangeThis

Ce guide aide un workspace en bêta privée à recevoir un premier feedback exploitable depuis un site réel ou de test.

## Pré-requis

- Un accès à la console ChangeThis.
- Un dépôt GitHub ou GitLab qui recevra les issues.
- L'URL du site où installer le widget, par exemple `https://client.example`.
- Un rôle `admin` ou `owner` dans le workspace ChangeThis.

## 1. Se connecter à la console

Ouvrir `/login`, saisir l'e-mail du compte invité et accéder à la console.

Si le workspace est neuf, vérifier d'abord que le nom du workspace et le compte owner sont corrects dans les paramètres.

## 2. Connecter GitHub ou GitLab

Aller dans `/settings/git-connections`, puis connecter le provider prévu pour ce client.

Pour la bêta privée, GitHub est prioritaire. GitLab peut rester en attente sauf si le client pilote en a besoin.

## 3. Créer le site connecté

Aller dans `/settings/connected-sites`, puis créer un site avec :

- le nom du site ;
- l'origine autorisée, par exemple `https://client.example` ;
- le provider Git ;
- le dépôt cible.

ChangeThis génère une clé publique de projet et un script widget lié à cette origine.

## 4. Installer le widget

Copier le script fourni par ChangeThis dans le site client, avant `</body>` :

```html
<script src="https://app.changethis.dev/widget.js" data-project="project_public_key"></script>
```

En local, remplacer le domaine par l'URL du serveur de développement :

```html
<script src="http://localhost:3000/widget.js" data-project="project_public_key"></script>
```

Le feedback public sera refusé si l'origine du navigateur ne correspond pas à l'origine autorisée du site connecté.

## 5. Envoyer un feedback test

Ouvrir le site où le widget est installé, cliquer sur le bouton Feedback, puis envoyer un commentaire simple.

Retourner dans `/projects` et vérifier que le feedback apparaît dans l'inbox.

## 6. Créer une issue

Depuis `/projects`, ouvrir le feedback puis créer l'issue externe.

La première boucle est validée quand :

- le feedback est visible dans ChangeThis ;
- l'issue GitHub ou GitLab est créée dans le bon dépôt ;
- le statut du feedback passe à `sent_to_provider`.

## Dépannage rapide

- Si le widget ne s'affiche pas, vérifier que `/widget.js` répond bien en JavaScript.
- Si l'envoi échoue avec une erreur d'origine, comparer l'origine configurée dans ChangeThis avec `window.location.origin` sur le site client.
- Si les dépôts ne sont pas listés, vérifier la connexion Git dans `/settings/git-connections`.
- Si l'issue n'est pas créée, vérifier les permissions du token/provider sur le dépôt cible.
