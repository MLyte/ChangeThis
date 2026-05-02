# Configurer GitHub pour ChangeThis

Ce guide décrit le chemin bêta pour connecter GitHub à un workspace ChangeThis et créer des issues depuis les feedbacks.

## Pré-requis

- Un accès `admin` ou `owner` au workspace ChangeThis.
- Un dépôt GitHub où ChangeThis peut créer des issues.
- Un compte GitHub ayant accès au dépôt cible.
- Pour le mode token serveur: un token GitHub autorisé à lire les dépôts et créer des issues.

## 1. Connecter GitHub dans ChangeThis

Ouvrir `/settings/git-connections`, puis choisir GitHub.

En bêta privée, GitHub est le provider prioritaire. Si plusieurs modes de connexion sont disponibles, privilégier le chemin GitHub App quand il est activé pour l'environnement. Le token serveur reste utile en local ou pour une intégration pilote simple.

## 2. Vérifier les dépôts accessibles

Après connexion, ChangeThis doit pouvoir lister les dépôts disponibles.

Si la liste est vide ou indisponible :

- vérifier que le compte GitHub a accès au dépôt ;
- vérifier que le token ou l'installation GitHub App couvre bien le dépôt ;
- vérifier que les issues sont activées sur le dépôt ;
- reconnecter GitHub si le statut indique `needs_reconnect`.

## 3. Associer un site à un dépôt

Aller dans `/settings/connected-sites`, créer ou modifier un site, puis sélectionner :

- le provider `GitHub` ;
- le dépôt cible ;
- l'origine autorisée du site client.

Cette association lie la clé publique du widget, l'origine autorisée et la destination d'issue. Le widget ne reçoit pas les détails internes de la destination GitHub.

## 4. Tester la création d'issue

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
