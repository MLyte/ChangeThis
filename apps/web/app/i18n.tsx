"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Locale = "fr" | "en";

type Dictionary = Record<string, string>;

const storageKey = "changethis:preferredLanguage";

const dictionaries: Record<Locale, Dictionary> = {
  fr: {
    "nav.logout": "Se déconnecter",
    "nav.localMode": "Mode local",
    "nav.login": "Connexion",
    "nav.signup": "S'inscrire",
    "nav.auth.local": "Auth locale",
    "nav.auth.supabase": "Auth Supabase",
    "nav.storage.local": "Stockage local",
    "nav.storage.database": "Base de données",
    "nav.issues": "Issues",
    "nav.connectedSites": "Sites connectés",
    "nav.settings": "Paramètres",
    "settings.eyebrow": "Paramètres",
    "settings.title": "Paramètres",
    "settings.sidebar.label": "Sections des paramètres",
    "settings.sidebar.gitConnections": "Connexions Git",
    "settings.sidebar.connectedSites": "Sites connectés",
    "settings.sidebar.users": "Utilisateurs",
    "settings.gitConnections.title": "Connexions Git",
    "settings.users.title": "Utilisateurs",
    "settings.users.copy": "Les clients peuvent toujours envoyer un feedback sans compte. Ces accès servent uniquement à consulter et traiter les retours dans la console.",
    "footer.copy": "Retours, connexions Git et code d'installation au même endroit.",
    "footer.support": "Support",
    "footer.license": "Licence",
    "footer.creator": "mathieuluyten.be",
    "footer.gitAccounts": "Comptes Git",
    "login.eyebrow": "Accès console · bêta privée",
    "login.title": "Connexion ChangeThis",
    "login.lede": "Connectez-vous pour accéder à la console privée. Les inscriptions publiques sont fermées pendant la bêta.",
    "login.email": "E-mail professionnel",
    "login.password": "Mot de passe",
    "login.submit": "Continuer",
    "login.localSubmit": "Ouvrir la console locale",
    "login.localMode.title": "Mode local actif",
    "login.localMode.copy": "L'environnement local utilise une session de développement non destructive. Le flux reste compatible avec l'authentification Supabase.",
    "login.error": "Connexion impossible pour le moment. Vérifiez vos informations puis réessayez.",
    "login.redirectHint": "Vous serez redirigé vers la page demandée après connexion.",
    "login.noBackend": "Authentification serveur indisponible dans cet environnement.",
    "login.privateBeta.title": "Bêta privée",
    "login.privateBeta.copy": "Les inscriptions sont fermées pour le moment. L'accès à la console se fait uniquement sur invitation ou avec un compte déjà créé.",
    "auth.confirm.title": "Connexion sécurisée en cours.",
    "auth.confirm.copy": "Nous vérifions le lien reçu par e-mail avant de finaliser votre compte.",
    "signup.eyebrow": "Créer un compte",
    "signup.title": "Commencez avec votre e-mail.",
    "signup.lede": "Indiquez votre e-mail professionnel et choisissez votre mot de passe. Votre espace ChangeThis est créé immédiatement.",
    "signup.organization": "Nom de l'organisation",
    "signup.password": "Mot de passe",
    "signup.submit": "Créer mon compte",
    "signup.localSubmit": "Ouvrir la console locale",
    "signup.redirectHint": "Le mot de passe doit contenir au moins 8 caractères. Vous arriverez ensuite sur la configuration du premier site.",
    "signup.loginHint": "Vous avez déjà un compte ?",
    "login.signupHint": "Pas encore de compte ?",
    "signup.error": "Envoi du lien impossible pour le moment. Vérifiez l'e-mail puis réessayez.",
    "signup.localMode.copy": "Le mode local ouvre directement la console de configuration, sans créer de compte distant.",
    "signup.sent.title": "Vérifiez votre boîte mail",
    "signup.sent.copy": "Nous avons envoyé un lien sécurisé. Ouvrez-le pour choisir votre mot de passe et créer votre espace ChangeThis.",
    "signup.setPassword.eyebrow": "E-mail vérifié",
    "signup.setPassword.title": "Choisissez votre mot de passe.",
    "signup.setPassword.lede": "Votre e-mail est validé. Créez maintenant le mot de passe qui servira aux prochaines connexions.",
    "signup.setPassword.password": "Nouveau mot de passe",
    "signup.setPassword.copy": "Votre espace est créé automatiquement à partir de votre e-mail professionnel. Vous pourrez renommer l'organisation plus tard.",
    "signup.setPassword.submit": "Créer mon espace",
    "signup.setPassword.error": "Création du mot de passe impossible pour le moment. Réessayez avec un mot de passe d'au moins 8 caractères.",
    "signup.proof.site": "1 site connecté",
    "signup.proof.git": "1 dépôt Git choisi",
    "signup.proof.widget": "1 script à installer",
    "nav.main": "Navigation principale",
    "nav.project": "Navigation projet",
    "nav.demo": "Navigation démo",
    "nav.inbox": "Retours",
    "nav.demoWidget": "Démo widget",
    "nav.openConsole": "Ouvrir la console",
    "nav.language": "Sélecteur de langue",

    "home.workflow.1": "Le bouton de retour garde le message, la page, la taille d'écran, le repère et l'image.",
    "home.workflow.1.strong": "Contexte complet.",
    "home.workflow.2": "Triez les retours utilisateurs, ajoutez un commentaire, puis décidez quoi envoyer vers GitHub ou GitLab.",
    "home.workflow.2.strong": "Décision rapide.",
    "home.workflow.3": "ChangeThis prépare une tâche claire dans l'espace GitHub ou GitLab lié au site.",
    "home.workflow.3.strong": "Tâche prête.",
    "home.siteState.ready": "Prêt",
    "home.siteState.configure": "À configurer",
    "home.hero.eyebrow": "Disponible prochainement",
    "home.hero.statement": "Transformez les retours clients de vos sites en tâches prêtes à envoyer vers GitHub ou GitLab.",
    "home.hero.statement.prefix": "Transformez les retours clients de vos sites en tâches prêtes à envoyer vers",
    "home.hero.statement.or": "ou",
    "home.hero.statement.suffix": "",
    "home.hero.lede": "ChangeThis est en développement. Les premiers accès ouvriront progressivement.",
    "home.hero.primary": "Traiter les retours",
    "home.hero.signup": "Accéder à la bêta",
    "home.hero.login": "J'ai déjà un compte",
    "home.hero.secondary": "Envoyer un retour test",
    "home.hero.trust": "Les visiteurs envoient des retours sans compte. Seul votre espace d'équipe est protégé.",
    "home.hero.privateBeta": "Bêta privée : les inscriptions sont actuellement fermées. Utilisez un compte existant pour accéder à la console.",
    "home.waitlist.callout.title": "Recevoir une invitation",
    "home.waitlist.callout.copy": "Entrez votre e-mail professionnel pour être prévenu quand un accès bêta correspondra à votre usage.",
    "home.signup.callout.title": "Accès ouvert",
    "home.signup.callout.copy": "Créez votre espace équipe et commencez à connecter vos sites dès maintenant.",
    "home.waitlist.label": "E-mail professionnel",
    "home.waitlist.submit": "S'inscrire à la bêta",
    "home.waitlist.status.joined": "C'est noté. Nous vous préviendrons dès que l'accès public ouvre.",
    "home.waitlist.status.existing": "Cet e-mail est déjà dans la liste. Votre demande est bien enregistrée.",
    "home.waitlist.status.error": "Inscription impossible pour le moment. Vérifiez l'e-mail puis réessayez.",
    "home.waitlist.point.1": "Accès progressif, sans inscription publique ouverte.",
    "home.waitlist.point.2": "Pensé pour les équipes qui travaillent avec GitHub ou GitLab.",
    "home.waitlist.point.3": "Invitation envoyée quand le chemin bêta est prêt pour votre usage.",
    "home.problem.eyebrow": "Pourquoi ChangeThis",
    "home.problem.title": "Les retours web utiles se perdent avant d'arriver au bon endroit.",
    "home.problem.question": "Ça vous arrive souvent ?",
    "home.problem.intro": "Avant la tâche, il y a souvent un signal incomplet: quelque part dans une conversation, sans assez de contexte pour agir.",
    "home.problem.point.1": "Les retours arrivent par e-mail, Slack, Teams, un Word ou une phrase autour de la machine à café.",
    "home.problem.point.2": "Les équipes manquent du contexte exact: page, taille d'écran, élément visé, capture.",
    "home.problem.point.3": "Les équipes perdent du temps à reformuler avant même de créer une tâche claire.",
    "home.problem.example.1.source": "Canaux dispersés",
    "home.problem.example.1.reality": "Un retour arrive par e-mail, Slack, Teams, un Word ou une phrase entre deux réunions.",
    "home.problem.example.1.consequence": "La remarque existe, mais elle n'a pas encore d'endroit clair où vivre.",
    "home.problem.example.2.source": "Contexte absent",
    "home.problem.example.2.reality": "On parle d'un bouton, mais pas de la page exacte, de la taille d'écran, ni de l'élément visé.",
    "home.problem.example.2.consequence": "L'équipe doit rejouer la scène avant même de comprendre quoi corriger.",
    "home.problem.example.3.source": "Filtre manquant",
    "home.problem.example.3.reality": "Un petit doute devient vite une tâche Git, même quand il faudrait juste clarifier ou archiver.",
    "home.problem.example.3.consequence": "Sans tri simple avant Git, le dépôt se remplit de bruit avant les vrais sujets.",
    "home.beta.eyebrow": "Ce que fait ChangeThis",
    "home.beta.title": "Capturez le retour, décidez quoi en faire, puis préparez une tâche exploitable.",
    "home.beta.capture.title": "Retour bien situé",
    "home.beta.capture.copy": "Message, page, taille d'écran, repère et capture réunis dans un seul retour.",
    "home.beta.inbox.title": "Boîte de réception claire",
    "home.beta.inbox.copy": "Triez les retours avant de les envoyer à la bonne personne ou au bon outil.",
    "home.beta.routing.title": "Tâche prête à traiter",
    "home.beta.routing.copy": "Un brouillon clair avec tout le contexte utile.",
    "home.beta.access.title": "Sites et dépôts liés",
    "home.beta.access.copy": "Chaque site peut pointer vers le bon dépôt GitHub ou GitLab.",
    "home.context.eyebrow": "Ce que contient un retour",
    "home.context.title": "Le contexte arrive avec le retour.",
    "home.context.copy": "Chaque retour garde les détails nécessaires pour comprendre la situation sans refaire l'enquête.",
    "home.context.page.title": "Page exacte",
    "home.context.page.copy": "URL, titre de page et site lié au retour.",
    "home.context.device.title": "Appareil et navigateur",
    "home.context.device.copy": "Appareil, navigateur et système pour vérifier où le problème apparaît.",
    "home.context.viewport.title": "Taille d'écran",
    "home.context.viewport.copy": "Largeur, hauteur et densité d'affichage pour reproduire le bon écran.",
    "home.context.message.title": "Message du visiteur",
    "home.context.message.copy": "Texte libre laissé avec le retour, sans compte visiteur.",
    "home.context.pin.title": "Repère sur la page",
    "home.context.pin.copy": "Position du repère, coordonnées et zone visée quand le visiteur pointe un élément.",
    "home.context.capture.title": "Capture de zone",
    "home.context.capture.copy": "Image jointe quand une capture est utile pour vérifier le problème.",
    "home.context.element.title": "Élément ciblé",
    "home.context.element.copy": "Élément pointé et texte visible quand le visiteur vise une zone précise.",
    "home.context.routing.title": "Destination de traitement",
    "home.context.routing.copy": "Site, espace d'équipe et dépôt Git prévu pour préparer la tâche.",
    "home.mobile.eyebrow": "Boucle mobile",
    "home.mobile.title": "Le retour commence souvent sur mobile. Le contexte doit suivre.",
    "home.mobile.title.intro": "Les clients utilisent aussi leur mobile.",
    "home.mobile.title.impact": "Les retours doivent fonctionner sur chaque appareil.",
    "home.mobile.copy": "Côté visiteur, le bouton de retour reste compact. Côté équipe, chaque signal conserve la page, le statut et la destination Git sans devenir un outil lourd.",
    "home.mobile.point.visitor": "Visiteur sans compte",
    "home.mobile.point.team": "Tri côté équipe",
    "home.mobile.point.context": "Contexte prêt à traiter",
    "home.mobile.label.visitor": "Visiteur",
    "home.mobile.label.team": "Équipe",
    "home.workflow.capture.title": "Le visiteur signale",
    "home.workflow.capture.copy": "Il ajoute une note, pointe une zone ou demande une capture sans créer de compte.",
    "home.workflow.triage.title": "L'équipe qualifie",
    "home.workflow.triage.copy": "L'espace d'équipe regroupe les retours par site, état et destination pour décider vite.",
    "home.workflow.issue.title": "La tâche part au bon endroit",
    "home.workflow.issue.copy": "Le contexte utile accompagne la tâche Git, au lieu de rester perdu dans un fil de discussion.",
    "home.beta.scope.eyebrow": "Cadre bêta",
    "home.beta.scope.title.main": "Disponible prochainement,",
    "home.beta.scope.title.small": "avec accès volontairement progressif.",
    "home.beta.note.1": "Les visiteurs n'ont pas besoin de compte pour envoyer un retour.",
    "home.beta.note.2": "L'espace de traitement reste réservé aux équipes invitées.",
    "home.beta.note.3": "Les connexions GitHub et GitLab sont prévues dans le parcours bêta selon la configuration de chaque équipe.",
    "home.beta.note.4": "Les inscriptions publiques ouvriront progressivement après validation des premiers cas réels.",
    "home.closing.eyebrow": "Liste d'attente",
    "home.closing.title.small": "Réservez votre accès",
    "home.closing.title.main": "dès maintenant",
    "home.closing.copy": "Laissez votre e-mail pour être invité quand la bêta pourra couvrir votre cas: site à connecter, retours à qualifier, tâches Git à préparer.",
    "home.ops.label": "État opérationnel",
    "home.product.eyebrow": "Première vue utilisable",
    "home.product.title": "Tout ce qu'il faut pour passer du signal client à l'action.",
    "home.product.inbox.title": "Retours conservés",
    "home.product.inbox.strong": "Rien ne disparaît.",
    "home.product.inbox.copy": "Les retours restent disponibles, avec leur état, les erreurs éventuelles et la prochaine tentative.",
    "home.product.config.title": "Configuration par site",
    "home.product.config.strong": "Un site, un dépôt.",
    "home.product.config.copy": "Chaque clé publique conserve ses origines autorisées et son dépôt cible GitHub ou GitLab.",
    "home.product.draft.title": "Brouillon lisible",
    "home.product.draft.strong": "Contexte complet.",
    "home.product.draft.copy": "La tâche contient message, page, taille d'écran, langue, repère, capture et détails utiles.",
    "home.product.retry.title": "Reprise contrôlée",
    "home.product.retry.strong": "Relances lisibles.",
    "home.product.retry.copy": "Les retours à reprendre restent visibles, rejouables manuellement, puis automatisables via la route de relance.",
    "home.workflow.eyebrow": "Flux produit",
    "home.workflow.title": "As easy as A, B, C",
    "home.signup.eyebrow": "Bêta privée",
    "home.signup.title": "Accès sur invitation, espace privé, bouton de retour testable.",
    "home.signup.copy": "La démo reste publique pour tester le bouton de retour. L'accès à l'espace d'équipe est limité aux comptes déjà créés pendant la phase bêta.",
    "home.signup.primary": "Se connecter",
    "home.signup.secondary": "Voir la démo",
    "home.install.eyebrow": "Installation",
    "home.install.title": "Une ligne de code par site, une clé publique par projet.",
    "home.install.strong": "Installation simple.",
    "home.install.copy": "Le code de test suit le même chemin que la production. La page démo permet de tester le parcours complet sans compte client.",
    "home.preview.label": "Aperçu de la console ChangeThis",
    "home.preview.badge": "Aperçu bêta",
    "home.preview.private": "Accès privé",
    "home.preview.metric.signal": "signal client",
    "home.preview.metric.viewport": "mobile",
    "home.preview.metric.destination": "préparé",
    "home.preview.draft.eyebrow": "Brouillon",
    "home.preview.context.page": "Page",
    "home.preview.context.viewport": "Écran",
    "home.preview.context.type": "Type",
    "home.preview.context.received": "Reçu",
    "home.preview.route.eyebrow": "Routage",
    "home.preview.route.title": "Prêt pour issue",
    "home.preview.sidebar.sites": "Sites",
    "home.preview.sidebar.integrations": "Intégrations",
    "home.preview.header": "Retours entrants",
    "home.preview.recent": "récents",
    "home.preview.empty.title": "Aucun retour pour le moment",
    "home.preview.empty.copy": "Envoyez un retour depuis la démo pour alimenter cet espace.",
    "home.preview.ready": "prêt",
    "home.loop.aria": "Aperçu du parcours ChangeThis",
    "home.loop.setup.eyebrow": "Installer",
    "home.loop.setup.title": "Code à ajouter sur le site, Git connecté dans l'espace équipe.",
    "home.loop.script.aria": "Exemple de script ChangeThis",
    "home.loop.git.title": "Destinations des tâches",
    "home.loop.visitor.eyebrow": "Capturer",
    "home.loop.visitor.title": "Le client annote la page, capture ou pose un repère.",
    "home.loop.fakeSite.title": "Booking portal",
    "home.loop.fakeSite.subtitle": "Checkout mobile",
    "home.loop.widget.note": "Note",
    "home.loop.widget.marker": "Repère",
    "home.loop.widget.capture": "Capture",
    "home.loop.widget.copy": "Le bouton devis est trop bas sur mobile.",
    "home.loop.widget.send": "Envoyer",
    "home.loop.developer.eyebrow": "Trier",
    "home.loop.developer.title": "La boîte de réception transforme le retour en décision.",
    "home.loop.inbox.active": "À traiter",
    "home.loop.feedback.1.title": "Repère sur /checkout",
    "home.loop.feedback.1.copy": "Le bouton devis tombe trop bas sur iPhone.",
    "home.loop.feedback.1.meta": "Écran mobile",
    "home.loop.feedback.2.title": "Capture des tarifs",
    "home.loop.feedback.2.copy": "L'espace entre les cartes casse la lecture.",
    "home.loop.feedback.2.meta": "Capture + page",
    "home.loop.feedback.3.title": "Note sur /demo",
    "home.loop.feedback.3.copy": "Le titre semble trop dense en desktop.",
    "home.loop.feedback.3.meta": "Commentaire",
    "home.loop.actions.task": "Tâche",
    "home.loop.actions.archive": "Archiver",

    "status.raw": "à créer",
    "status.raw.long": "À créer",
    "status.issue_creation_pending": "en cours",
    "status.issue_creation_pending.long": "Création en cours",
    "status.retrying": "relance",
    "status.retrying.long": "Relance planifiée",
    "status.sent_to_provider": "envoyé",
    "status.sent_to_provider.long": "Envoyé",
    "status.failed": "échec",
    "status.failed.long": "Échec fournisseur",
    "status.kept": "conservé",
    "status.kept.long": "Conservé",
    "status.resolved": "résolu",
    "status.resolved.long": "Résolu",
    "status.ignored": "ignoré",
    "status.ignored.long": "Ignoré",

    "demo.eyebrow": "Bac à sable widget",
    "demo.title": "Site client de test",
    "demo.statement": "Utilisez le bouton Feedback en bas à droite pour créer un retour dans la boîte de réception locale.",
    "demo.lede": "Cette page charge le bundle widget local et l'API locale. Les retours arrivent dans la boîte de réception durable, puis peuvent être envoyés vers GitHub ou GitLab selon la destination configurée pour le site.",
    "demo.badge": "Staging client",
    "demo.content.title": "Refonte page contact",
    "demo.content.copy": "Le client peut cliquer n'importe où sur cette page, pointer un élément visuel, ajouter une note, ou demander une capture du viewport.",
    "demo.cta.primary": "Demander un devis",
    "demo.cta.secondary": "Voir les services",
    "demo.scenarios.title": "Scénarios à tester",
    "demo.scenarios.1": "Note simple sur le contenu",
    "demo.scenarios.2": "Pin sur le bouton principal",
    "demo.scenarios.3": "Capture avec champs sensibles masqués",
    "demo.email": "E-mail client",
    "demo.privateComment": "Commentaire privé",
    "demo.privateValue": "Ce champ doit être masqué pendant la capture.",

    "projects.eyebrow": "Console opérationnelle",
    "projects.title": "Retours ChangeThis",
    "projects.lede": "Centralisez les retours des sites, vérifiez le brouillon d'issue et envoyez-le vers la bonne destination GitHub ou GitLab.",
    "projects.testFeedback": "Envoyer un retour test",
    "projects.dashboard.updated": "Dernier signal",
    "projects.ops.label": "État production",
    "projects.ops.sites": "sites pilotes",
    "projects.ops.github": "vers GitHub",
    "projects.ops.gitlab": "vers GitLab",
    "projects.ops.feedbacks": "retours durables",
    "projects.metrics.label": "Synthèse des retours",
    "projects.metric.pending": "À traiter",
    "projects.metric.queued": "En file",
    "projects.metric.retries": "Relances",
    "projects.metric.failed": "Échecs à corriger",
    "projects.metric.sent": "Issues créées",
    "projects.signals.eyebrow": "Signaux",
    "projects.signals.title": "Vue opérateur",
    "projects.signals.queue": "File active",
    "projects.signals.queue.copy": "retours visibles hors archive.",
    "projects.signals.latest": "Dernier signal",
    "projects.signals.latest.copy": "date du dernier retour reçu.",
    "projects.signals.latest.empty": "aucun retour reçu.",
    "projects.signals.routing": "Routage Git",
    "projects.signals.routing.copy": "sites GitHub / sites GitLab configurés.",
    "projects.signals.archive": "Archive",
    "projects.signals.archive.copy": "retours ignorés conservés.",
    "projects.inbox.eyebrow": "Retours collectés",
    "projects.inbox.title": "File de traitement",
    "projects.inbox.copy": "Priorisez les nouveaux retours, rejouez les erreurs récupérables et gardez les retours ignorés hors de la file principale.",
    "projects.inbox.label": "État des retours",
    "projects.inbox.pending": "à traiter",
    "projects.inbox.test": "Tester le widget",
    "projects.inbox.retryDue": "Réessayer les issues en attente",
    "projects.queue.new": "Nouveaux",
    "projects.queue.new.copy": "retours prêts à devenir des issues.",
    "projects.queue.recovery": "Reprise",
    "projects.queue.recovery.copy": "retours en échec ou en relance.",
    "projects.queue.done": "Traités",
    "projects.queue.done.copy": "issues déjà envoyées.",
    "projects.empty.title": "Aucun retour actif",
    "projects.empty.copy": "Envoyez un retour depuis la démo pour créer une première carte dans la boîte de réception. Les retours ignorés restent archivés et les nouveaux retours réapparaîtront ici.",
    "projects.ops.eyebrow": "États et reprise",
    "projects.ops.title": "Ce que ChangeThis garde visible",
    "projects.ops.provider.title": "Erreur fournisseur",
    "projects.ops.provider.copy": "Le message d'erreur reste sur la carte. Si l'erreur est récupérable, une relance automatique est planifiée.",
    "projects.ops.manual.title": "Relance manuelle",
    "projects.ops.manual.copy": "Le bouton Réenvoyer relance la création d'issue pour un retour précis, sans dupliquer une issue déjà envoyée.",
    "projects.ops.archive.title": "Archive propre",
    "projects.ops.archive.copy": "Les retours ignorés ne polluent plus la boîte de réception, mais restent dans le stockage local.",
    "projects.feedback.meta": "Métadonnées du retour",
    "projects.feedback.noMessage": "Aucun message fourni.",
    "projects.feedback.issueError": "Création d'issue impossible",
    "projects.feedback.nextRetry": "Nouvelle tentative possible à partir de",
    "projects.feedback.draft": "Brouillon d'issue",
    "projects.feedback.capture": "Capture",
    "projects.feedback.destination": "Destination",

    "destinations.message.initial": "Choisissez un site, GitHub ou GitLab, puis liez un dépôt cible.",
    "destinations.message.error": "Impossible de lier ce dépôt.",
    "destinations.message.missing": "site(s) sans destination.",
    "destinations.eyebrow": "Routage obligatoire",
    "destinations.title": "Chaque site choisit GitHub ou GitLab avant d'envoyer une issue",
    "destinations.configure": "Configurer",
    "destinations.connected": "Connecté",
    "destinations.toConnect": "À connecter",
    "destinations.verify": "Vérifier",
    "destinations.connect": "Connecter",
    "destinations.manage": "Gérer",
    "destinations.test.connection": "Tester la connexion",
    "destinations.test.running": "Test en cours...",
    "destinations.link.title": "Lier un site à son dépôt d'issues",
    "destinations.link.copy": "Cette configuration est sauvegardée côté serveur et pilote la création réelle des issues depuis la boîte de réception.",
    "destinations.site": "Site",
    "destinations.provider": "Fournisseur",
    "destinations.repository": "Dépôt cible",
    "destinations.linking": "Liaison en cours...",
    "destinations.save": "Sauvegarder",
    "destinations.sites.eyebrow": "Sites pilotes",
    "destinations.sites.title": "Un fournisseur explicite par site",
    "destinations.ready": "Prêt pour créer des issues",
    "destinations.required": "Configuration requise",
    "destinations.open": "Ouvrir",
    "destinations.integration.connectFlow": "Connexion guidée",
    "destinations.integration.credentials": "Identifiants serveur",
    "destinations.integration.ready": "Prêt",
    "destinations.integration.connectUnavailable": "Configuration requise",
    "destinations.integration.githubConnectionHelp": "Configurez une GitHub App pour activer le bouton de connexion.",
    "destinations.integration.githubCredentialHelp": "Ajoutez un token GitHub ou les identifiants de la GitHub App avant de créer une issue.",
    "destinations.integration.gitlabConnectionHelp": "Configurez une application OAuth GitLab pour activer le bouton de connexion.",
    "destinations.integration.gitlabCredentialHelp": "Ajoutez un token GitLab ou terminez OAuth avant de créer une issue.",

    "actions.issue.view": "Voir l'issue",
    "actions.issue.sync": "Vérifier",
    "actions.ignored": "Ignoré",
    "actions.kept": "Conservé",
    "actions.keepFeedback": "Conserver sans issue",
    "actions.replay": "Réenvoyer",
    "actions.create": "Créer l'issue",
    "actions.processing": "Traitement en cours...",
    "actions.ignore": "Ignorer",
    "actions.close": "Fermer",
    "issueComposer.title": "Préparer l'issue",
    "issueComposer.copy": "Modifiez le titre, complétez la description ou ajoutez votre réponse avant de créer l'issue Git.",
    "issueComposer.issueTitle": "Titre",
    "issueComposer.description": "Description / commentaire",
    "issueComposer.labels": "Labels",
    "issueComposer.labelsHint": "Séparez les labels par des virgules.",
    "issueComposer.cancel": "Annuler",
    "issueComposer.submit": "Créer l'issue",
    "actions.error.impossible": "Action impossible pour le moment. Réessayez dans quelques secondes.",
    "actions.error.connection": "Connexion interrompue. Vérifiez le serveur local puis réessayez."
  },
  en: {
    "nav.logout": "Log out",
    "nav.localMode": "Local mode",
    "nav.login": "Sign in",
    "nav.signup": "Sign up",
    "nav.auth.local": "Local auth",
    "nav.auth.supabase": "Supabase auth",
    "nav.storage.local": "Local storage",
    "nav.storage.database": "Database",
    "nav.issues": "Issues",
    "nav.connectedSites": "Connected sites",
    "nav.settings": "Settings",
    "settings.eyebrow": "Settings",
    "settings.title": "Settings",
    "settings.sidebar.label": "Settings sections",
    "settings.sidebar.gitConnections": "Git connections",
    "settings.sidebar.connectedSites": "Connected sites",
    "settings.sidebar.users": "Users",
    "settings.gitConnections.title": "Git connections",
    "settings.users.title": "Users",
    "settings.users.copy": "Clients can still submit feedback without an account. These accounts only control access to the console and feedback processing.",
    "footer.copy": "Feedback, Git connections, and install code in one place.",
    "footer.support": "Support",
    "footer.license": "License",
    "footer.creator": "mathieuluyten.be",
    "footer.gitAccounts": "Git accounts",
    "login.eyebrow": "Console access · private beta",
    "login.title": "Sign in to ChangeThis",
    "login.lede": "Sign in to access the private console. Public signups are closed during the beta.",
    "login.email": "Work email",
    "login.password": "Password",
    "login.submit": "Continue",
    "login.localSubmit": "Open local console",
    "login.localMode.title": "Local mode active",
    "login.localMode.copy": "The local environment uses a non-destructive development session. The flow remains compatible with Supabase auth.",
    "login.error": "Sign-in is not available right now. Check your details and try again.",
    "login.redirectHint": "You will be redirected to the requested page after sign-in.",
    "login.noBackend": "Server authentication is unavailable in this environment.",
    "login.privateBeta.title": "Private beta",
    "login.privateBeta.copy": "Signups are currently closed. Console access is limited to invited users or accounts that already exist.",
    "auth.confirm.title": "Secure sign-in in progress.",
    "auth.confirm.copy": "We are verifying the email link before finalizing your account.",
    "signup.eyebrow": "Create an account",
    "signup.title": "Start with your email.",
    "signup.lede": "Enter your work email and choose your password. Your ChangeThis workspace is created immediately.",
    "signup.organization": "Organization name",
    "signup.password": "Password",
    "signup.submit": "Create my account",
    "signup.localSubmit": "Open local console",
    "signup.redirectHint": "Use at least 8 characters. You will land on the first site setup next.",
    "signup.loginHint": "Already have an account?",
    "login.signupHint": "Need an account?",
    "signup.error": "We cannot send the link right now. Check the email and try again.",
    "signup.localMode.copy": "Local mode opens the setup console directly without creating a remote account.",
    "signup.sent.title": "Check your inbox",
    "signup.sent.copy": "We sent a secure link. Open it to choose your password and create your ChangeThis workspace.",
    "signup.setPassword.eyebrow": "Email verified",
    "signup.setPassword.title": "Choose your password.",
    "signup.setPassword.lede": "Your email is verified. Create the password you will use for future sign-ins.",
    "signup.setPassword.password": "New password",
    "signup.setPassword.copy": "Your workspace is created automatically from your work email. You can rename the organization later.",
    "signup.setPassword.submit": "Create my workspace",
    "signup.setPassword.error": "We cannot create the password right now. Try again with a password of at least 8 characters.",
    "signup.proof.site": "1 connected site",
    "signup.proof.git": "1 selected Git repository",
    "signup.proof.widget": "1 script to install",
    "nav.main": "Main navigation",
    "nav.project": "Project navigation",
    "nav.demo": "Demo navigation",
    "nav.inbox": "Inbox",
    "nav.demoWidget": "Widget demo",
    "nav.openConsole": "Open console",
    "nav.language": "Language switcher",

    "home.workflow.1": "The feedback button keeps the message, page, screen size, marker, and screenshot.",
    "home.workflow.1.strong": "Full context.",
    "home.workflow.2": "Sort user feedback, add a comment, then decide what should go to GitHub or GitLab.",
    "home.workflow.2.strong": "Fast decision.",
    "home.workflow.3": "ChangeThis prepares a clear task in the GitHub or GitLab space linked to the site.",
    "home.workflow.3.strong": "Ready task.",
    "home.siteState.ready": "Ready",
    "home.siteState.configure": "Needs setup",
    "home.hero.eyebrow": "Available soon",
    "home.hero.statement": "Turn website customer feedback into tasks ready for GitHub or GitLab.",
    "home.hero.statement.prefix": "Turn website customer feedback into tasks ready for",
    "home.hero.statement.or": "or",
    "home.hero.statement.suffix": "",
    "home.hero.lede": "ChangeThis is in development. Early access will open gradually.",
    "home.hero.primary": "Review feedback",
    "home.hero.signup": "Access the beta",
    "home.hero.login": "I already have an account",
    "home.hero.secondary": "Send test feedback",
    "home.hero.trust": "Visitors send feedback without an account. Only your team space is protected.",
    "home.hero.privateBeta": "Private beta: signups are currently closed. Use an existing account to access the console.",
    "home.waitlist.callout.title": "Get an invitation",
    "home.waitlist.callout.copy": "Enter your work email to be notified when a beta seat matches your use case.",
    "home.signup.callout.title": "Access is open",
    "home.signup.callout.copy": "Create your team space and start connecting your sites now.",
    "home.waitlist.label": "Work email",
    "home.waitlist.submit": "Join the beta",
    "home.waitlist.status.joined": "You're on the list. We will let you know when public access opens.",
    "home.waitlist.status.existing": "This email is already on the list. You're safely in.",
    "home.waitlist.status.error": "We cannot add this email right now. Check it and try again.",
    "home.waitlist.point.1": "Gradual access, with no open public signup yet.",
    "home.waitlist.point.2": "Designed for teams working with GitHub or GitLab.",
    "home.waitlist.point.3": "Invitation sent when the beta path is ready for your use case.",
    "home.problem.eyebrow": "Why ChangeThis",
    "home.problem.title": "Useful website feedback gets lost before it reaches the right place.",
    "home.problem.question": "Does this happen often?",
    "home.problem.intro": "Before the task, there is often an incomplete signal: somewhere in a conversation, without enough context to act.",
    "home.problem.point.1": "Feedback arrives through email, Slack, Teams, a Word document, or a sentence by the coffee machine.",
    "home.problem.point.2": "Teams miss the exact context: page, screen size, selected element, screenshot.",
    "home.problem.point.3": "Teams lose time rewriting feedback before creating a clear task.",
    "home.problem.example.1.source": "Scattered channels",
    "home.problem.example.1.reality": "Feedback arrives through email, Slack, Teams, a Word document, or a sentence by the coffee machine.",
    "home.problem.example.1.consequence": "The note exists, but nobody knows yet where to put it or who should handle it.",
    "home.problem.example.2.source": "Missing context",
    "home.problem.example.2.reality": "The message mentions a button, without the exact page, screen size, selected element, or clear screenshot.",
    "home.problem.example.2.consequence": "The team has to replay the issue, ask follow-up questions, and loses the initial thread.",
    "home.problem.example.3.source": "Missing filter",
    "home.problem.example.3.reality": "A small doubt quickly becomes a Git task, even when it only needs clarification or archiving.",
    "home.problem.example.3.consequence": "Without a simple review step before Git, the repository fills with noise before the real topics.",
    "home.beta.eyebrow": "What ChangeThis does",
    "home.beta.title": "Capture feedback, decide what to do with it, then prepare an actionable task.",
    "home.beta.capture.title": "Well-located feedback",
    "home.beta.capture.copy": "Message, page, screen size, marker, and screenshot grouped into one feedback item.",
    "home.beta.inbox.title": "Clear feedback space",
    "home.beta.inbox.copy": "Sort feedback before sending it to the right person or tool.",
    "home.beta.routing.title": "Task ready to handle",
    "home.beta.routing.copy": "A clear draft with all useful context.",
    "home.beta.access.title": "Sites mapped to repositories",
    "home.beta.access.copy": "Each site can point to the right GitHub or GitLab repository.",
    "home.context.eyebrow": "What a feedback item contains",
    "home.context.title": "Context arrives with the feedback.",
    "home.context.copy": "Each feedback item keeps the details needed to understand the situation without investigating from scratch.",
    "home.context.page.title": "Exact page",
    "home.context.page.copy": "URL, page title, and the site linked to the feedback.",
    "home.context.device.title": "Device and browser",
    "home.context.device.copy": "Device, browser, and system details to verify where the issue appears.",
    "home.context.viewport.title": "Screen size",
    "home.context.viewport.copy": "Width, height, and display density to reproduce the right screen.",
    "home.context.message.title": "Visitor message",
    "home.context.message.copy": "Free-text note sent with the feedback, without a visitor account.",
    "home.context.pin.title": "Page marker",
    "home.context.pin.copy": "Marker position, coordinates, and targeted area when the visitor points to something.",
    "home.context.capture.title": "Area screenshot",
    "home.context.capture.copy": "Image attached when a screenshot helps verify the issue.",
    "home.context.element.title": "Targeted element",
    "home.context.element.copy": "Selected element and visible text when the visitor points to a precise area.",
    "home.context.routing.title": "Review destination",
    "home.context.routing.copy": "Site, team space, and intended Git repository used to prepare the task.",
    "home.mobile.eyebrow": "Mobile loop",
    "home.mobile.title": "Feedback often starts on mobile. The context should follow.",
    "home.mobile.title.intro": "Clients also use their phones.",
    "home.mobile.title.impact": "Feedback should work on every device.",
    "home.mobile.copy": "For visitors, the feedback button stays compact. For teams, each signal keeps the page, status, and Git destination without becoming a heavy tool.",
    "home.mobile.point.visitor": "Visitor without account",
    "home.mobile.point.team": "Team triage",
    "home.mobile.point.context": "Context ready to handle",
    "home.mobile.label.visitor": "Visitor",
    "home.mobile.label.team": "Team",
    "home.workflow.capture.title": "The visitor reports",
    "home.workflow.capture.copy": "They add a note, point to an area, or request a screenshot without creating an account.",
    "home.workflow.triage.title": "The team qualifies",
    "home.workflow.triage.copy": "The team space groups feedback by site, state, and destination so decisions stay quick.",
    "home.workflow.issue.title": "The task lands correctly",
    "home.workflow.issue.copy": "Useful context follows the Git task instead of getting lost in a chat thread.",
    "home.beta.scope.eyebrow": "Beta scope",
    "home.beta.scope.title.main": "Available soon,",
    "home.beta.scope.title.small": "with deliberately gradual access.",
    "home.beta.note.1": "Visitors do not need an account to send feedback.",
    "home.beta.note.2": "The review space stays limited to invited teams.",
    "home.beta.note.3": "GitHub and GitLab connections are planned for the beta flow according to each team's setup.",
    "home.beta.note.4": "Public signups will open gradually after the first real use cases are validated.",
    "home.closing.eyebrow": "Waitlist",
    "home.closing.title.small": "Reserve your access",
    "home.closing.title.main": "now",
    "home.closing.copy": "Leave your email to be invited when the beta can cover your case: site to connect, feedback to review, Git tasks to prepare.",
    "home.ops.label": "Operational status",
    "home.product.eyebrow": "Ready-to-use view",
    "home.product.title": "Everything you need to turn customer signals into action.",
    "home.product.inbox.title": "Saved feedback",
    "home.product.inbox.strong": "Nothing disappears.",
    "home.product.inbox.copy": "Feedback stays available with its state, possible errors, and the next retry.",
    "home.product.config.title": "Per-site configuration",
    "home.product.config.strong": "One site, one repository.",
    "home.product.config.copy": "Each public key keeps its allowed origins and target GitHub or GitLab repository.",
    "home.product.draft.title": "Readable draft",
    "home.product.draft.strong": "Full context.",
    "home.product.draft.copy": "The task includes the message, page, screen size, language, marker, screenshot, and useful details.",
    "home.product.retry.title": "Controlled recovery",
    "home.product.retry.strong": "Visible failures.",
    "home.product.retry.copy": "API failures are visible, manually replayable, then automatable through the retries route.",
    "home.workflow.eyebrow": "Product flow",
    "home.workflow.title": "As easy as A, B, C",
    "home.signup.eyebrow": "Private beta",
    "home.signup.title": "Invite-only access, private team space, testable feedback button.",
    "home.signup.copy": "The demo stays public to test the feedback button. Team-space access is limited to accounts that were already created during the beta phase.",
    "home.signup.primary": "Sign in",
    "home.signup.secondary": "View demo",
    "home.install.eyebrow": "Installation",
    "home.install.title": "One line of code per site, one public key per project.",
    "home.install.strong": "Simple install.",
    "home.install.copy": "The test code follows the same path as production. The demo page lets you test the full flow without a customer account.",
    "home.preview.label": "ChangeThis console preview",
    "home.preview.badge": "Beta preview",
    "home.preview.private": "Private access",
    "home.preview.metric.signal": "client signal",
    "home.preview.metric.viewport": "mobile",
    "home.preview.metric.destination": "prepared",
    "home.preview.draft.eyebrow": "Draft",
    "home.preview.context.page": "Page",
    "home.preview.context.viewport": "Screen",
    "home.preview.context.type": "Type",
    "home.preview.context.received": "Received",
    "home.preview.route.eyebrow": "Routing",
    "home.preview.route.title": "Ready for issue",
    "home.preview.sidebar.sites": "Sites",
    "home.preview.sidebar.integrations": "Integrations",
    "home.preview.header": "Incoming feedback",
    "home.preview.recent": "recent",
    "home.preview.empty.title": "No feedback yet",
    "home.preview.empty.copy": "Send feedback from the demo to populate this space.",
    "home.preview.ready": "ready",
    "home.loop.aria": "ChangeThis journey preview",
    "home.loop.setup.eyebrow": "Install",
    "home.loop.setup.title": "Add the code to the site, connect Git in the team space.",
    "home.loop.script.aria": "ChangeThis script example",
    "home.loop.git.title": "Task destinations",
    "home.loop.visitor.eyebrow": "Capture",
    "home.loop.visitor.title": "The client annotates the page, captures it, or drops a marker.",
    "home.loop.fakeSite.title": "Booking portal",
    "home.loop.fakeSite.subtitle": "Mobile checkout",
    "home.loop.widget.note": "Note",
    "home.loop.widget.marker": "Marker",
    "home.loop.widget.capture": "Capture",
    "home.loop.widget.copy": "The quote button sits too low on mobile.",
    "home.loop.widget.send": "Send",
    "home.loop.developer.eyebrow": "Sort",
    "home.loop.developer.title": "The feedback space turns feedback into a decision.",
    "home.loop.inbox.active": "To handle",
    "home.loop.feedback.1.title": "Marker on /checkout",
    "home.loop.feedback.1.copy": "The quote button drops too low on iPhone.",
    "home.loop.feedback.1.meta": "Mobile screen",
    "home.loop.feedback.2.title": "Pricing capture",
    "home.loop.feedback.2.copy": "The spacing between cards breaks readability.",
    "home.loop.feedback.2.meta": "Capture + page",
    "home.loop.feedback.3.title": "Note on /demo",
    "home.loop.feedback.3.copy": "The title feels too dense on desktop.",
    "home.loop.feedback.3.meta": "Comment",
    "home.loop.actions.task": "Task",
    "home.loop.actions.archive": "Archive",

    "status.raw": "to create",
    "status.raw.long": "To create",
    "status.issue_creation_pending": "in progress",
    "status.issue_creation_pending.long": "Creation in progress",
    "status.retrying": "retry",
    "status.retrying.long": "Retry scheduled",
    "status.sent_to_provider": "sent",
    "status.sent_to_provider.long": "Sent",
    "status.failed": "failed",
    "status.failed.long": "Provider failure",
    "status.kept": "kept",
    "status.kept.long": "Kept",
    "status.resolved": "resolved",
    "status.resolved.long": "Resolved",
    "status.ignored": "ignored",
    "status.ignored.long": "Ignored",

    "demo.eyebrow": "Widget sandbox",
    "demo.title": "Test customer site",
    "demo.statement": "Use the Feedback button in the bottom-right corner to create feedback in the local inbox.",
    "demo.lede": "This page loads the local widget bundle and local API. Feedback lands in the persistent inbox, then can be sent to GitHub or GitLab depending on the configured site destination.",
    "demo.badge": "Customer staging",
    "demo.content.title": "Contact page redesign",
    "demo.content.copy": "The customer can click anywhere on this page, point to a visual element, add a note, or request a viewport screenshot.",
    "demo.cta.primary": "Request a quote",
    "demo.cta.secondary": "View services",
    "demo.scenarios.title": "Scenarios to test",
    "demo.scenarios.1": "Simple note on content",
    "demo.scenarios.2": "Pin on the main button",
    "demo.scenarios.3": "Screenshot with sensitive fields masked",
    "demo.email": "Client email",
    "demo.privateComment": "Private comment",
    "demo.privateValue": "This field should be masked during capture.",

    "projects.eyebrow": "Operational console",
    "projects.title": "ChangeThis inbox",
    "projects.lede": "Centralize site feedback, review the issue draft, and send it to the right GitHub or GitLab destination.",
    "projects.testFeedback": "Send test feedback",
    "projects.dashboard.updated": "Latest signal",
    "projects.ops.label": "Production status",
    "projects.ops.sites": "pilot sites",
    "projects.ops.github": "to GitHub",
    "projects.ops.gitlab": "to GitLab",
    "projects.ops.feedbacks": "persistent feedback",
    "projects.metrics.label": "Inbox summary",
    "projects.metric.pending": "To triage",
    "projects.metric.queued": "Queued",
    "projects.metric.retries": "Retries",
    "projects.metric.failed": "Failures to fix",
    "projects.metric.sent": "Issues created",
    "projects.signals.eyebrow": "Signals",
    "projects.signals.title": "Operator view",
    "projects.signals.queue": "Active queue",
    "projects.signals.queue.copy": "feedback visible outside the archive.",
    "projects.signals.latest": "Latest signal",
    "projects.signals.latest.copy": "date of the latest feedback received.",
    "projects.signals.latest.empty": "no feedback received.",
    "projects.signals.routing": "Git routing",
    "projects.signals.routing.copy": "GitHub sites / GitLab sites configured.",
    "projects.signals.archive": "Archive",
    "projects.signals.archive.copy": "ignored feedback kept.",
    "projects.inbox.eyebrow": "Collected feedback",
    "projects.inbox.title": "Processing queue",
    "projects.inbox.copy": "Prioritize new feedback, replay recoverable errors, and keep ignored feedback out of the main queue.",
    "projects.inbox.label": "Inbox status",
    "projects.inbox.pending": "to triage",
    "projects.inbox.test": "Test widget",
    "projects.inbox.retryDue": "Retry pending issues",
    "projects.queue.new": "New",
    "projects.queue.new.copy": "feedback ready to become issues.",
    "projects.queue.recovery": "Recovery",
    "projects.queue.recovery.copy": "failed feedback and scheduled retries.",
    "projects.queue.done": "Processed",
    "projects.queue.done.copy": "issues already sent.",
    "projects.empty.title": "No active feedback",
    "projects.empty.copy": "Send feedback from the demo to create the first inbox card. Ignored feedback stays archived and new feedback will reappear here.",
    "projects.ops.eyebrow": "States and recovery",
    "projects.ops.title": "What ChangeThis keeps visible",
    "projects.ops.provider.title": "Provider error",
    "projects.ops.provider.copy": "The error message stays on the card. If the error is recoverable, an automatic retry is scheduled.",
    "projects.ops.manual.title": "Manual retry",
    "projects.ops.manual.copy": "The Replay button restarts issue creation for one specific feedback without duplicating an already sent issue.",
    "projects.ops.archive.title": "Clean archive",
    "projects.ops.archive.copy": "ignored feedback items no longer clutter the inbox, but remain in the local store.",
    "projects.feedback.meta": "Feedback metadata",
    "projects.feedback.noMessage": "No message provided.",
    "projects.feedback.issueError": "Issue creation failed",
    "projects.feedback.nextRetry": "Next retry available from",
    "projects.feedback.draft": "Issue draft",
    "projects.feedback.capture": "Screenshot",
    "projects.feedback.destination": "Destination",

    "destinations.message.initial": "Choose a site and GitHub or GitLab, then link a target repository.",
    "destinations.message.error": "Unable to link this repository.",
    "destinations.message.missing": "site(s) without a destination.",
    "destinations.eyebrow": "Required routing",
    "destinations.title": "Each site chooses GitHub or GitLab before sending issues",
    "destinations.configure": "Configure",
    "destinations.connected": "Connected",
    "destinations.toConnect": "To connect",
    "destinations.verify": "Verify",
    "destinations.connect": "Connect",
    "destinations.manage": "Manage",
    "destinations.test.connection": "Test connection",
    "destinations.test.running": "Testing...",
    "destinations.link.title": "Link a site to its issue repository",
    "destinations.link.copy": "This configuration is saved server-side and drives real issue creation from the inbox.",
    "destinations.site": "Site",
    "destinations.provider": "Provider",
    "destinations.repository": "Target repository",
    "destinations.linking": "Linking...",
    "destinations.save": "Save",
    "destinations.sites.eyebrow": "Pilot sites",
    "destinations.sites.title": "One explicit provider per site",
    "destinations.ready": "Ready to create issues",
    "destinations.required": "Configuration required",
    "destinations.open": "Open",
    "destinations.integration.connectFlow": "Guided connection",
    "destinations.integration.credentials": "Server credential",
    "destinations.integration.ready": "Ready",
    "destinations.integration.connectUnavailable": "Configuration required",
    "destinations.integration.githubConnectionHelp": "Configure a GitHub App to enable the connection button.",
    "destinations.integration.githubCredentialHelp": "Add a GitHub token or GitHub App credentials before creating an issue.",
    "destinations.integration.gitlabConnectionHelp": "Configure a GitLab OAuth application to enable the connection button.",
    "destinations.integration.gitlabCredentialHelp": "Add a GitLab token or complete OAuth before creating an issue.",

    "actions.issue.view": "View issue",
    "actions.issue.sync": "Check",
    "actions.ignored": "Ignored",
    "actions.kept": "Kept",
    "actions.keepFeedback": "Keep without issue",
    "actions.replay": "Replay",
    "actions.create": "Create issue",
    "actions.processing": "Processing...",
    "actions.ignore": "Ignore",
    "actions.close": "Close",
    "issueComposer.title": "Prepare issue",
    "issueComposer.copy": "Edit the title, complete the description, or add your reply before creating the Git issue.",
    "issueComposer.issueTitle": "Title",
    "issueComposer.description": "Description / comment",
    "issueComposer.labels": "Labels",
    "issueComposer.labelsHint": "Separate labels with commas.",
    "issueComposer.cancel": "Cancel",
    "issueComposer.submit": "Create issue",
    "actions.error.impossible": "This action is not available right now. Try again in a few seconds.",
    "actions.error.connection": "Connection interrupted. Check the local server, then try again."
  }
};

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");

  useEffect(() => {
    const savedLocale = window.localStorage.getItem(storageKey);
    if (savedLocale !== "fr" && savedLocale !== "en") {
      return;
    }

    window.setTimeout(() => setLocaleState(savedLocale), 0);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === "fr" ? "fr-BE" : "en";
  }, [locale]);

  const value = useMemo<LanguageContextValue>(() => ({
    locale,
    setLocale: (nextLocale) => {
      setLocaleState(nextLocale);
      window.localStorage.setItem(storageKey, nextLocale);
    },
    t: (key) => dictionaries[locale][key] ?? dictionaries.fr[key] ?? key
  }), [locale]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }

  return context;
}

export function T({ k }: { k: string }) {
  const { t } = useLanguage();
  return <>{t(k)}</>;
}

export function TRich({ k }: { k: string }) {
  const { locale, t } = useLanguage();
  return <>{richText(locale, k) ?? t(k)}</>;
}

function richText(locale: Locale, key: string): ReactNode | undefined {
  if (locale === "en") {
    switch (key) {
      case "home.hero.lede":
        return <>ChangeThis is <strong>in development</strong>. Early access will open gradually.</>;
      case "home.waitlist.callout.copy":
        return <>Enter your work email to be notified when <strong>a beta seat matches your use case</strong>.</>;
      case "home.signup.callout.copy":
        return <>Create your team space and start connecting <strong>your sites</strong> now.</>;
      case "home.problem.point.1":
        return <>Feedback arrives through <strong>email, Slack, Teams</strong>, a Word document, or <strong>a sentence by the coffee machine</strong>.</>;
      case "home.problem.title":
        return <>Useful website feedback gets lost <strong>before it reaches the right place</strong>.</>;
      case "home.problem.point.2":
        return <>Teams miss the exact context: <strong>page, screen size</strong>, selected element, screenshot.</>;
      case "home.problem.point.3":
        return <>Teams lose time rewriting feedback before creating <strong>a clear task</strong>.</>;
      case "home.problem.example.1.reality":
        return <>Feedback arrives through <strong>email, Slack, Teams</strong>, a Word document, or <strong>a sentence by the coffee machine</strong>.</>;
      case "home.problem.example.1.consequence":
        return <>The note exists, but nobody knows yet <strong>where to put it</strong> or who should handle it.</>;
      case "home.problem.example.2.reality":
        return <>The message mentions a button, without the exact <strong>page, screen size, selected element</strong>, or clear screenshot.</>;
      case "home.problem.example.2.consequence":
        return <>The team has to replay the issue, ask follow-up questions, and <strong>loses the initial thread</strong>.</>;
      case "home.problem.example.3.reality":
        return <>A small doubt quickly becomes <strong>a Git task</strong>, even when it only needs clarification or archiving.</>;
      case "home.problem.example.3.consequence":
        return <>Without a <strong>simple review step before Git</strong>, the repository fills with noise before the real topics.</>;
      case "home.beta.capture.copy":
        return <>Message, page, screen size, marker, and screenshot grouped into <strong>one feedback item</strong>.</>;
      case "home.beta.inbox.copy":
        return <>Sort feedback before sending it to <strong>the right person</strong> or <strong>the right tool</strong>.</>;
      case "home.beta.routing.copy":
        return <>A clear draft with <strong>all useful context</strong>.</>;
      case "home.beta.access.copy":
        return <>Each site can point to <strong>the right GitHub or GitLab repository</strong>.</>;
      case "home.mobile.copy":
        return <>For visitors, the feedback button stays compact. For teams, each signal keeps <strong>the page, state, and Git destination</strong> without becoming a heavy tool.</>;
      case "home.workflow.capture.copy":
        return <>They add a note, point to an area, or request a screenshot <strong>without creating an account</strong>.</>;
      case "home.workflow.triage.copy":
        return <>The team space groups feedback by <strong>site, state, and destination</strong> so decisions stay quick.</>;
      case "home.workflow.issue.copy":
        return <>Useful context follows the Git task instead of getting lost in <strong>a chat thread</strong>.</>;
      case "home.beta.note.1":
        return <>Visitors do not need an account to <strong>send feedback</strong>.</>;
      case "home.beta.note.2":
        return <>The review space stays limited to <strong>invited teams</strong>.</>;
      case "home.beta.note.3":
        return <>GitHub and GitLab connections are planned for the beta flow according to <strong>each team&apos;s setup</strong>.</>;
      case "home.beta.note.4":
        return <>Public signups will open gradually after <strong>the first real use cases</strong> are validated.</>;
      case "home.closing.copy":
        return <>Leave your email to be invited when the beta can cover your case: <strong>site to connect, feedback to review, Git tasks to prepare</strong>.</>;
      default:
        return undefined;
    }
  }

  switch (key) {
    case "home.hero.lede":
      return <>ChangeThis est <strong>en développement</strong>. Les premiers accès ouvriront progressivement.</>;
    case "home.waitlist.callout.copy":
      return <>Entrez votre e-mail professionnel pour être prévenu quand <strong>un accès bêta correspondra à votre usage</strong>.</>;
    case "home.signup.callout.copy":
      return <>Créez votre espace équipe et commencez à connecter <strong>vos sites</strong> dès maintenant.</>;
    case "home.problem.point.1":
      return <>Les retours arrivent par <strong>e-mail, Slack, Teams</strong>, un Word ou <strong>une phrase autour de la machine à café</strong>.</>;
    case "home.problem.title":
      return <>Les retours web utiles se perdent <strong>avant d&apos;arriver au bon endroit</strong>.</>;
    case "home.problem.point.2":
      return <>Les équipes manquent du contexte exact: <strong>page, taille d&apos;écran</strong>, élément visé, capture.</>;
    case "home.problem.point.3":
      return <>Les équipes perdent du temps à reformuler avant même de créer <strong>une tâche claire</strong>.</>;
    case "home.problem.example.1.reality":
      return <>Un retour arrive par <strong>e-mail, Slack, Teams</strong>, un Word ou <strong>une phrase entre deux réunions</strong>.</>;
    case "home.problem.example.1.consequence":
      return <>La remarque existe, mais elle n&apos;a pas encore <strong>d&apos;endroit clair où vivre</strong>.</>;
    case "home.problem.example.2.reality":
      return <>On parle d&apos;un bouton, mais pas de la <strong>page exacte</strong>, de la <strong>taille d&apos;écran</strong>, ni de <strong>l&apos;élément visé</strong>.</>;
    case "home.problem.example.2.consequence":
      return <>L&apos;équipe doit rejouer la scène avant même de <strong>comprendre quoi corriger</strong>.</>;
    case "home.problem.example.3.reality":
      return <>Un petit doute devient vite <strong>une tâche Git</strong>, même quand il faudrait juste clarifier ou archiver.</>;
    case "home.problem.example.3.consequence":
      return <>Sans <strong>tri simple avant Git</strong>, le dépôt se remplit de bruit avant les vrais sujets.</>;
    case "home.beta.capture.copy":
      return <>Message, page, taille d&apos;écran, repère et capture réunis dans <strong>un seul retour</strong>.</>;
    case "home.beta.inbox.copy":
      return <>Triez les retours avant de les envoyer à <strong>la bonne personne</strong> ou <strong>au bon outil</strong>.</>;
    case "home.beta.routing.copy":
      return <>Un brouillon clair avec <strong>tout le contexte utile</strong>.</>;
    case "home.beta.access.copy":
      return <>Chaque site peut pointer vers <strong>le bon dépôt GitHub ou GitLab</strong>.</>;
    case "home.mobile.copy":
      return <>Côté visiteur, le bouton de retour reste compact. Côté équipe, chaque signal conserve <strong>la page, le statut et la destination Git</strong> sans devenir un outil lourd.</>;
    case "home.workflow.capture.copy":
      return <>Il ajoute une note, pointe une zone ou demande une capture <strong>sans créer de compte</strong>.</>;
    case "home.workflow.triage.copy":
      return <>L&apos;espace d&apos;équipe regroupe les retours par <strong>site, état et destination</strong> pour décider vite.</>;
    case "home.workflow.issue.copy":
      return <>Le contexte utile accompagne la tâche Git, au lieu de rester perdu dans <strong>un fil de discussion</strong>.</>;
    case "home.beta.note.1":
      return <>Les visiteurs n&apos;ont pas besoin de compte pour <strong>envoyer un retour</strong>.</>;
    case "home.beta.note.2":
      return <>L&apos;espace de traitement reste réservé aux <strong>équipes invitées</strong>.</>;
    case "home.beta.note.3":
      return <>Les connexions GitHub et GitLab sont prévues dans le parcours bêta selon <strong>la configuration de chaque équipe</strong>.</>;
    case "home.beta.note.4":
      return <>Les inscriptions publiques ouvriront progressivement après validation des <strong>premiers cas réels</strong>.</>;
    case "home.closing.copy":
      return <>Laissez votre e-mail pour être invité quand la bêta pourra couvrir votre cas: <strong>site à connecter, retours à qualifier, tâches Git à préparer</strong>.</>;
    default:
      return undefined;
  }
}

export function LanguageSwitch() {
  const { locale, setLocale, t } = useLanguage();

  return (
    <div className="language-switch" role="group" aria-label={t("nav.language")}>
      {(["fr", "en"] as const).map((item) => (
        <button
          aria-pressed={locale === item}
          className={locale === item ? "is-active" : ""}
          key={item}
          onClick={() => setLocale(item)}
          type="button"
        >
          {item.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
