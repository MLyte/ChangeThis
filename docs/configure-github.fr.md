# Configurer GitHub pour ChangeThis

Etat actuel: voir [current-state.fr.md](current-state.fr.md).

Ce guide décrit le chemin bêta pour connecter GitHub à un workspace ChangeThis et créer des issues depuis les feedbacks.

## Pré-requis

- Un accès `admin` ou `owner` au workspace ChangeThis.
- Un dépôt GitHub où ChangeThis peut créer des issues.
- Un compte GitHub ayant accès au dépôt cible.
- Pour le mode token serveur: un token GitHub autorisé à lire les dépôts et créer des issues.

## 1. Connecter GitHub dans ChangeThis

Ouvrir `/settings/git-connections`, puis choisir GitHub.

En bêta ouverte contrôlée, GitHub et GitLab sont supportés. Si plusieurs modes de connexion GitHub sont disponibles, privilégier le chemin GitHub App quand il est activé pour l'environnement. Le token serveur reste utile en local ou pour une intégration pilote simple.

Deux chemins existent aujourd'hui:

- **GitHub App**: l'UI démarre l'installation via `GITHUB_APP_SLUG`; le serveur utilise `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY` et l'installation stockée pour créer un token d'installation.
- **Token serveur/local**: `GITHUB_TOKEN` ou `CHANGETHIS_GITHUB_TOKEN` reste un fallback utile en local ou pilote. Le bouton de génération de token ouvre GitHub, mais ne connecte pas automatiquement un token dans l'UI.

## 2. Créer un fine-grained token GitHub

Depuis `/settings/git-connections`, le bouton **Générer un token** ouvre GitHub sur la création d'un fine-grained token.

Dans GitHub:

1. **Token name**: utiliser un nom explicite, par exemple `ChangeThis`.
2. **Resource owner**: choisir le compte ou l'organisation qui possède le dépôt cible.
3. **Expiration**: choisir une durée limitée si possible.
4. **Repository access**:
   - choisir **Only select repositories** pour limiter le token au dépôt client; ou
   - choisir **All repositories** si le workspace doit pouvoir sélectionner plusieurs dépôts.
5. **Permissions > Repository permissions**:
   - ajouter **Metadata** en `Read-only` si GitHub le demande;
   - ajouter **Issues** en `Read and write`.
6. Cliquer **Generate token**.
7. Copier le token immédiatement: GitHub ne le réaffichera plus ensuite.
8. Revenir dans ChangeThis, coller le token dans GitHub, puis enregistrer.

ChangeThis n'a pas besoin de permission sur le code pour créer des issues. Si GitHub répond `Resource not accessible by personal access token`, le dépôt cible n'est pas inclus dans `Repository access` ou la permission **Issues** n'est pas en `Read and write`.

## 3. Vérifier les dépôts accessibles

Après connexion, ChangeThis doit pouvoir lister les dépôts disponibles.

Si la liste est vide ou indisponible :

- vérifier que le compte GitHub a accès au dépôt ;
- vérifier que le token ou l'installation GitHub App couvre bien le dépôt ;
- vérifier que les issues sont activées sur le dépôt ;
- reconnecter GitHub si le statut indique `needs_reconnect`.

## 4. Associer un site à un dépôt

Aller dans `/settings/connected-sites`, créer ou modifier un site, puis sélectionner :

- le provider `GitHub` ;
- le dépôt cible ;
- l'origine autorisée du site client.

Cette association lie la clé publique du widget, l'origine autorisée et la destination d'issue. Le widget ne reçoit pas les détails internes de la destination GitHub.

## 5. Tester la création d'issue

Envoyer un feedback depuis le site connecté, puis ouvrir `/projects`.

Depuis le feedback, lancer la création d'issue. La boucle GitHub est validée quand :

- le feedback passe à `sent_to_provider` ;
- un lien externe vers l'issue GitHub apparaît ;
- l'issue existe dans le dépôt attendu ;
- le titre, la description, les labels et le contexte de page sont lisibles.

## Variables utiles en local

Pour un usage local avec token serveur :

```env
GITHUB_TOKEN=github_pat_or_classic_token
# ou
CHANGETHIS_GITHUB_TOKEN=github_pat_or_classic_token
```

Pour la fiabilité provider, le timeout HTTP est configurable :

```env
ISSUE_PROVIDER_TIMEOUT_MS=10000
```

## Dépannage

- `auth_failed`: reconnecter GitHub ou renouveler le token.
- `permission_denied`: vérifier les droits du compte sur le dépôt et l'accès aux issues.
- `target_not_found`: vérifier que le dépôt sélectionné existe encore et reste accessible.
- `validation_failed`: vérifier le titre, la description et les labels envoyés à GitHub.
- `rate_limited`: attendre la fin de la limite GitHub ou réduire les relances.
- `transient_failure`: relancer après quelques minutes; vérifier aussi `ISSUE_PROVIDER_TIMEOUT_MS`.

## Notes de sécurité

- Ne jamais exposer de token GitHub au navigateur ou dans le snippet widget.
- Ne pas stocker de token dans un fichier versionné.
- En production SaaS, préférer une GitHub App avec installation par workspace plutôt qu'un token partagé.
- Les webhooks provider et la synchronisation entrante complète restent des limites beta.
