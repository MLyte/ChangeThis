"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Locale = "fr" | "en";

type Dictionary = Record<string, string>;

const storageKey = "changethis:preferredLanguage";
const storageSourceKey = "changethis:preferredLanguageSource";

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
    "settings.users.copy": "Les visiteurs peuvent toujours envoyer un feedback sans compte. Ces accès servent uniquement à consulter et traiter les retours dans le dashboard.",
    "footer.copy": "Transformez chaque feedback client en tâche claire, contextualisée et prête à traiter.",
    "footer.support": "Support",
    "footer.license": "Licence",
    "footer.creator": "Me contacter",
    "footer.gitAccounts": "Comptes Git",
    "footer.status.openBeta": "Bêta ouverte",
    "footer.status.paused": "Accès limité",
    "footer.runtime.production": "Production",
    "footer.runtime.local": "Local",
    "pause.eyebrow": "Réouverture en préparation",
    "pause.title": "ChangeThis prépare sa prochaine phase.",
    "pause.lede": "Les inscriptions publiques sont temporairement fermées pendant que le service est consolidé. La vitrine reste ouverte pour découvrir le produit et demander des nouvelles.",
    "pause.card.title": "Accès public temporairement fermé",
    "pause.card.copy": "La création de compte et la connexion publique sont mises en pause. Des accès pilotes peuvent être ouverts sur demande pour les équipes intéressées.",
    "pause.contact": "Demander un accès pilote",
    "pause.demo": "Voir la démo",
    "pause.noStorage": "Le bouton de contact ouvre une page externe. Aucun e-mail n'est collecté ou stocké dans ChangeThis pendant cette période.",
    "login.eyebrow": "Accès dashboard · bêta ouverte",
    "login.title": "Connexion ChangeThis",
    "login.lede": "Connectez-vous pour accéder au dashboard. Les inscriptions peuvent être ouvertes ou temporairement suspendues selon l'environnement.",
    "login.email": "E-mail professionnel",
    "login.password": "Mot de passe",
    "login.submit": "Continuer",
    "login.localSubmit": "Ouvrir le dashboard local",
    "login.localMode.title": "Mode local actif",
    "login.localMode.copy": "L'environnement local utilise une session de développement non destructive. Le flux reste compatible avec l'authentification Supabase.",
    "login.error": "Connexion impossible pour le moment. Vérifiez vos informations puis réessayez.",
    "login.redirectHint": "Vous serez redirigé vers la page demandée après connexion.",
    "login.noBackend": "Authentification serveur indisponible dans cet environnement.",
    "login.privateBeta.title": "Inscriptions en pause",
    "login.privateBeta.copy": "Les inscriptions peuvent être temporairement fermées pendant une opération. Connectez-vous avec un compte existant ou réessayez plus tard.",
    "auth.confirm.title": "Connexion sécurisée en cours",
    "auth.confirm.copy": "Nous vérifions le lien reçu par e-mail avant de finaliser votre connexion.",
    "signup.eyebrow": "Créer un compte",
    "signup.title": "Créez votre compte avec votre e-mail",
    "signup.lede": "Saisissez votre e-mail professionnel. Nous vous envoyons un code sécurisé pour vérifier l'adresse et choisir votre mot de passe.",
    "signup.organization": "Nom de l'organisation",
    "signup.password": "Mot de passe",
    "signup.submit": "Recevoir le code sécurisé",
    "signup.localSubmit": "Ouvrir le dashboard local",
    "signup.redirectHint": "Le code reçu par e-mail vous permettra de choisir votre mot de passe avant d'ouvrir l'espace.",
    "signup.loginHint": "Vous avez déjà un compte ?",
    "login.signupHint": "Pas encore de compte ?",
    "signup.error": "Validation impossible pour le moment. Vérifiez l'e-mail ou le code puis réessayez.",
    "signup.localMode.copy": "Le mode local ouvre directement le dashboard de configuration, sans créer de compte distant.",
    "signup.sent.title": "Vérifiez votre boîte de réception",
    "signup.sent.copy": "Nous avons envoyé un code sécurisé. Copiez-le ici pour choisir votre mot de passe et créer votre espace ChangeThis.",
    "signup.code": "Code reçu par e-mail",
    "signup.codeHint": "Le code est personnel et expire rapidement.",
    "signup.verifyCode": "Valider le code",
    "signup.setPassword.eyebrow": "E-mail vérifié",
    "signup.setPassword.title": "Choisissez votre mot de passe.",
    "signup.setPassword.lede": "Votre e-mail est validé. Créez maintenant le mot de passe qui servira aux prochaines connexions.",
    "signup.setPassword.password": "Nouveau mot de passe",
    "signup.setPassword.copy": "Votre espace est créé automatiquement à partir de votre e-mail professionnel. Vous pourrez renommer l'organisation plus tard.",
    "signup.setPassword.submit": "Créer mon espace",
    "signup.setPassword.error": "Création du mot de passe impossible pour le moment. Réessayez avec un mot de passe d'au moins 8 caractères.",
    "signup.proof.site": "Créez votre premier site",
    "signup.proof.git": "Choisissez le dépôt Git",
    "signup.proof.widget": "Installez le script widget",
    "nav.main": "Navigation principale",
    "nav.project": "Navigation projet",
    "nav.demo": "Navigation démo",
    "nav.inbox": "Retours",
    "nav.demoWidget": "Démo widget",
    "nav.openConsole": "Ouvrir le dashboard",
    "nav.language": "Sélecteur de langue",

    "home.workflow.1": "Le bouton de feedback conserve le message, la page, la taille d'écran, le repère et la capture.",
    "home.workflow.1.strong": "Contexte complet.",
    "home.workflow.2": "Triez les retours utilisateurs, ajoutez un commentaire, puis décidez quoi envoyer vers GitHub ou GitLab.",
    "home.workflow.2.strong": "Décision rapide.",
    "home.workflow.3": "ChangeThis prépare une tâche claire dans l'espace GitHub ou GitLab lié au site.",
    "home.workflow.3.strong": "Tâche prête.",
    "home.siteState.ready": "Prêt",
    "home.siteState.configure": "À configurer",
    "home.hero.eyebrow": "Bêta ouverte",
    "home.hero.statement": "Recevez les feedbacks de vos sites avec le contexte utile, puis créez l'issue GitHub ou GitLab quand elle mérite d'être traitée.",
    "home.hero.statement.prefix": "Recevez les feedbacks de vos sites avec le contexte utile, puis créez l'issue dans",
    "home.hero.statement.or": "ou",
    "home.hero.statement.suffix": " quand elle mérite d'être traitée.",
    "home.hero.promise": "Un widget de feedback qui transforme chaque retour web en issue exploitable.",
    "home.hero.lede": "Installez un widget de feedback sur un vrai site, centralisez les feedbacks dans votre espace équipe, puis envoyez seulement les sujets utiles vers Git.",
    "home.hero.primary": "Traiter les retours",
    "home.hero.signup": "S'inscrire",
    "home.hero.login": "Connexion",
    "home.hero.secondary": "Tester le widget",
    "home.hero.trust": "Les visiteurs envoient des retours sans compte. Seul votre espace d'équipe est protégé.",
    "home.hero.proof.visitor": "Visiteur sans compte",
    "home.hero.proof.context": "Page + écran + capture",
    "home.hero.proof.git": "GitHub ou GitLab",
    "home.hero.proof.browser": "Aucun token Git côté navigateur",
    "home.hero.privateBeta": "Les inscriptions sont temporairement en pause. Les comptes existants peuvent toujours se connecter.",
    "home.waitlist.callout.title": "Inscriptions en pause",
    "home.waitlist.callout.copy": "Laissez votre e-mail professionnel. Nous vous prévenons dès que les inscriptions rouvrent.",
    "home.signup.callout.title": "Accès ouvert",
    "home.signup.callout.copy": "Créez l'espace équipe, connectez un dépôt et installez le widget sur votre premier site.",
    "home.console.callout.title": "Vous êtes connecté",
    "home.console.callout.copy": "Reprenez votre file de retours ou terminez la configuration de vos sites connectés.",
    "home.console.primary": "Ouvrir le dashboard",
    "home.console.secondary": "Configurer les sites",
    "home.waitlist.label": "E-mail professionnel",
    "home.waitlist.submit": "Prévenir à la réouverture",
    "home.waitlist.status.joined": "C'est noté. Nous vous préviendrons dès que les inscriptions rouvrent.",
    "home.waitlist.status.existing": "Cet e-mail est déjà dans la liste. Votre demande est bien enregistrée.",
    "home.waitlist.status.error": "Inscription impossible pour le moment. Vérifiez l'e-mail puis réessayez.",
    "home.waitlist.point.1": "Connecter un site.",
    "home.waitlist.point.2": "Installer le script.",
    "home.waitlist.point.3": "Recevoir un retour test.",
    "home.waitlist.point.4": "Créer l'issue utile.",
    "home.problem.eyebrow": "Pourquoi ChangeThis",
    "home.problem.title": "Les retours web utiles se perdent avant d'arriver au bon endroit.",
    "home.problem.question": "Moins de bruit avant Git.",
    "home.problem.intro": "ChangeThis garde une étape de tri entre le retour client et le dépôt Git, pour éviter les allers-retours, les doublons et les issues déjà traitées.",
    "home.problem.point.1": "Les feedbacks arrivent par e-mail, Slack, Teams, document Word ou discussion informelle.",
    "home.problem.point.2": "Les équipes manquent du contexte exact\u00a0: page, taille d'écran, élément visé, capture.",
    "home.problem.point.3": "Les équipes perdent du temps à reformuler avant même de créer une tâche claire.",
    "home.problem.example.1.source": "Canaux dispersés",
    "home.problem.example.1.reality": "Un feedback arrive par e-mail, Slack, Teams, document Word ou discussion entre deux réunions.",
    "home.problem.example.1.consequence": "Le client veut aider, mais le feedback finit trop vite dans un document, un message ou une note externe.",
    "home.problem.example.2.source": "Contexte absent",
    "home.problem.example.2.reality": "On parle d'un bouton, mais pas de la page exacte, de la taille d'écran, ni de l'élément visé.",
    "home.problem.example.2.consequence": "L'équipe doit rejouer la scène avant même de comprendre quoi corriger.",
    "home.problem.example.3.source": "Filtre manquant",
    "home.problem.example.3.reality": "Un petit doute devient vite une tâche Git, même quand il faudrait juste clarifier ou archiver.",
    "home.problem.example.3.consequence": "Sans tri simple avant Git, le dépôt se remplit de bruit avant les vrais sujets, avec parfois des doublons ou des issues déjà traitées.",
    "home.beta.eyebrow": "Ce que fait ChangeThis",
    "home.beta.title": "Capturez le retour, décidez quoi en faire, puis préparez une tâche exploitable.",
    "home.beta.capture.title": "Feedback contextualisé",
    "home.beta.capture.copy": "Message, page, taille d'écran, repère et capture réunis dans un seul feedback.",
    "home.beta.inbox.title": "Boîte de retours claire",
    "home.beta.inbox.copy": "Triez les retours avant de les envoyer à la bonne personne ou au bon outil.",
    "home.beta.routing.title": "Tâche prête à traiter",
    "home.beta.routing.copy": "Un brouillon clair avec tout le contexte utile.",
    "home.beta.access.title": "Sites et dépôts liés",
    "home.beta.access.copy": "Chaque site peut pointer vers le bon dépôt GitHub ou GitLab.",
    "home.context.eyebrow": "Contexte capturé",
    "home.context.title": "Le feedback conserve l'essentiel.",
    "home.context.copy": "Page, appareil, repère et destination restent attachés au feedback.",
    "home.context.page.title": "Page exacte",
    "home.context.page.copy": "URL, titre de page et site lié au retour.",
    "home.context.device.title": "Appareil et écran",
    "home.context.device.copy": "Navigateur, système et taille d'écran pour reproduire le bon cas.",
    "home.context.viewport.title": "Taille d'écran",
    "home.context.viewport.copy": "Largeur, hauteur et densité d'affichage pour reproduire le bon écran.",
    "home.context.message.title": "Message du visiteur",
    "home.context.message.copy": "Texte libre laissé avec le retour, sans compte visiteur.",
    "home.context.pin.title": "Repère ou capture",
    "home.context.pin.copy": "Zone pointée, épingle ou capture quand l'image aide à comprendre.",
    "home.context.capture.title": "Capture de zone",
    "home.context.capture.copy": "Image jointe quand une capture est utile pour vérifier le problème.",
    "home.context.element.title": "Élément ciblé",
    "home.context.element.copy": "Élément pointé et texte visible quand le visiteur vise une zone précise.",
    "home.context.routing.title": "Destination de traitement",
    "home.context.routing.copy": "Site, espace d'équipe et dépôt Git prévu pour préparer la tâche.",
    "home.mobile.eyebrow": "Expérience mobile",
    "home.mobile.title": "Le retour commence souvent sur mobile. Le contexte doit suivre.",
    "home.mobile.title.intro": "Sur petit écran.",
    "home.mobile.title.impact": "Le contexte reste exploitable.",
    "home.mobile.copy": "Côté visiteur, le bouton reste discret. Côté équipe, le contexte arrive prêt à traiter.",
    "home.mobile.point.visitor": "Visiteur sans compte",
    "home.mobile.point.team": "Tri côté équipe",
    "home.mobile.point.context": "Contexte prêt à traiter",
    "home.mobile.label.visitor": "Visiteur",
    "home.mobile.label.team": "Équipe",
    "home.publicSector.eyebrow": "Sécurité concrète",
    "home.publicSector.title": "Les bases à vérifier avant d'installer le widget.",
    "home.publicSector.lede": "ChangeThis n'est pas une certification sécurité. Le pilote doit rester simple : savoir quelles données partent, où elles vont, et qui peut les consulter.",
    "home.publicSector.theme.accessibility.title": "Pas de token Git dans le site",
    "home.publicSector.theme.accessibility.copy": "Le script installé ne contient aucun token GitHub ou GitLab. Les connexions restent côté serveur, hors navigateur.",
    "home.publicSector.theme.data.title": "Données visibles",
    "home.publicSector.theme.data.copy": "Un feedback peut contenir l'URL, le navigateur, la taille d'écran, le message, les repères et une capture quand l'utilisateur l'ajoute.",
    "home.publicSector.theme.pilot.title": "Contrôle par site",
    "home.publicSector.theme.pilot.copy": "Chaque site a ses origines autorisées, sa destination Git et ses réglages de widget.",
    "home.publicSector.notReplace.title": "À vérifier avant mise en ligne",
    "home.publicSector.notReplace.audit": "Aucun token Git dans le script ou le navigateur.",
    "home.publicSector.notReplace.support": "Domaines autorisés limités aux vrais sites concernés.",
    "home.publicSector.notReplace.certification": "Accès dashboard réservés aux personnes qui traitent les retours.",
    "home.publicSector.pilotScope.title": "À documenter simplement",
    "home.publicSector.pilotScope.pages": "Pages concernées.",
    "home.publicSector.pilotScope.screenshots": "Usage des captures et information aux testeurs.",
    "home.publicSector.pilotScope.retention": "Durée de conservation prévue.",
    "home.publicSector.pilotScope.review": "Responsable côté équipe.",
    "home.workflow.capture.title": "Le visiteur signale",
    "home.workflow.capture.copy": "Il ajoute une note, pointe une zone ou demande une capture sans créer de compte.",
    "home.workflow.triage.title": "L'équipe qualifie",
    "home.workflow.triage.copy": "L'espace d'équipe regroupe les retours par site, état et destination pour décider vite.",
    "home.workflow.issue.title": "La tâche part au bon endroit",
    "home.workflow.issue.copy": "Le contexte utile accompagne la tâche Git, au lieu de rester perdu dans un fil de discussion.",
    "home.beta.scope.eyebrow": "Cadre bêta ouverte",
    "home.beta.scope.title.main": "Ouverte maintenant.",
    "home.beta.note.1": "Les visiteurs n'ont pas besoin de compte pour envoyer un retour.",
    "home.beta.note.2": "Retrouvez vos dépôts dans l'espace d'équipe pour relier chaque site au bon projet.",
    "home.beta.note.3": "Fonctionne sur ordinateur, mobile et tablette.",
    "home.closing.eyebrow": "Premier site",
    "home.closing.title.small": "Configurez votre",
    "home.closing.title.main": "premier site",
    "home.closing.copy": "Créez votre espace, reliez un dépôt Git et installez le widget pour vérifier le circuit complet sur un vrai site.",
    "home.closing.proof.beta": "Accès ouvert",
    "home.closing.proof.visitors": "Retours sans compte visiteur",
    "home.closing.proof.git": "GitHub ou GitLab",
    "home.closing.panel.title": "Configurez votre premier site en quelques étapes.",
    "home.closing.panel.copy": "Le dashboard guide le lien entre domaine autorisé, dépôt Git et premier feedback exploitable.",
    "home.closing.step.site.title": "Site connecté",
    "home.closing.step.site.copy": "Ajoutez le domaine autorisé et récupérez la balise widget.",
    "home.closing.step.git.title": "Dépôt Git choisi",
    "home.closing.step.git.copy": "Reliez chaque site au dépôt qui recevra ses issues.",
    "home.closing.step.feedback.title": "Premier retour reçu",
    "home.closing.step.feedback.copy": "Envoyez un test, vérifiez le contexte et créez l'issue.",
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
    "home.workflow.title": "Un parcours en trois étapes",
    "home.signup.eyebrow": "Bêta ouverte",
    "home.signup.title": "Espace équipe, sites connectés et widget de feedback prêt à installer.",
    "home.signup.copy": "La bêta ouverte permet de créer un compte quand l'environnement autorise les inscriptions. La démo reste un bac à sable, pas une preuve d'installation client.",
    "home.signup.primary": "Se connecter",
    "home.signup.secondary": "Voir la démo",
    "home.install.eyebrow": "Installation",
    "home.install.title": "Une ligne de code par site, une clé publique par projet.",
    "home.install.strong": "Installation simple.",
    "home.install.copy": "Le code de test suit le même chemin que la production. La page démo permet de tester le parcours complet sans compte client.",
    "home.preview.label": "Aperçu du dashboard ChangeThis",
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
    "home.preview.route.title": "Prêt pour une issue",
    "home.preview.sidebar.sites": "Sites",
    "home.preview.sidebar.integrations": "Intégrations",
    "home.preview.header": "Retours entrants",
    "home.preview.recent": "récents",
    "home.preview.empty.title": "Aucun retour pour le moment",
    "home.preview.empty.copy": "Installez le widget sur un site connecté pour alimenter cet espace.",
    "home.preview.ready": "prêt",
    "home.loop.aria": "Aperçu du parcours ChangeThis",
    "home.loop.section.eyebrow": "Parcours produit",
    "home.loop.section.title": "Installez le widget, recevez le contexte, créez l'issue.",
    "home.loop.section.copy": "Le parcours garde le feedback exploitable : site lié, contexte capturé, brouillon prêt pour GitHub ou GitLab.",
    "home.loop.setup.eyebrow": "Installer",
    "home.loop.setup.title": "Installez le widget sur le site en dev ou en pilote.",
    "home.loop.script.aria": "Exemple de script ChangeThis",
    "home.loop.git.title": "Destinations des tâches",
    "home.loop.visitor.eyebrow": "Capturer",
    "home.loop.visitor.title": "Le visiteur signale le problème avec :",
    "home.loop.visitor.point.page": "la page",
    "home.loop.visitor.point.capture": "capturer une zone précise",
    "home.loop.visitor.point.pin": "poser une épingle précise",
    "home.loop.fakeSite.title": "Portail de réservation",
    "home.loop.fakeSite.subtitle": "Paiement mobile",
    "home.loop.widget.note": "Note",
    "home.loop.widget.marker": "Repère",
    "home.loop.widget.capture": "Capture",
    "home.loop.widget.copy": "Le bouton devis est trop bas sur mobile.",
    "home.loop.widget.send": "Envoyer",
    "home.loop.developer.eyebrow": "Trier",
    "home.loop.developer.title": "L'équipe reçoit le contexte et crée l'issue utile.",
    "home.loop.inbox.active": "À qualifier",
    "home.loop.feedback.1.title": "Repère sur /checkout",
    "home.loop.feedback.1.copy": "Le bouton devis tombe trop bas sur iPhone.",
    "home.loop.feedback.1.meta": "Écran mobile",
    "home.loop.feedback.2.title": "Capture des tarifs",
    "home.loop.feedback.2.copy": "L'espace entre les cartes casse la lecture.",
    "home.loop.feedback.2.meta": "Capture + page",
    "home.loop.feedback.3.title": "Note sur /demo",
    "home.loop.feedback.3.copy": "Le titre semble trop dense sur ordinateur.",
    "home.loop.feedback.3.meta": "Commentaire",
    "home.loop.actions.task": "Tâche",
    "home.loop.actions.archive": "Archiver",

    "status.raw": "à qualifier",
    "status.raw.long": "À qualifier",
    "status.issue_creation_pending": "en cours",
    "status.issue_creation_pending.long": "Création en cours",
    "status.retrying": "en relance",
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
    "demo.statement": "Utilisez le bouton Retour en bas à droite pour créer un retour dans la boîte locale.",
    "demo.lede": "Cette page charge le bundle widget local et l'API locale. Les feedbacks arrivent dans l'inbox persistante, puis peuvent être envoyés vers GitHub ou GitLab selon la destination configurée pour le site.",
    "demo.badge": "Staging client",
    "demo.content.title": "Refonte de la page contact",
    "demo.content.copy": "Le client peut cliquer n'importe où sur cette page, pointer un élément visuel, ajouter une note ou demander une capture de l'écran visible.",
    "demo.cta.primary": "Demander un devis",
    "demo.cta.secondary": "Voir les services",
    "demo.scenarios.title": "Scénarios à tester",
    "demo.scenarios.1": "Note simple sur le contenu",
    "demo.scenarios.2": "Repère sur le bouton principal",
    "demo.scenarios.3": "Capture avec champs sensibles masqués",
    "demo.email": "E-mail client",
    "demo.privateComment": "Commentaire privé",
    "demo.privateValue": "Ce champ doit être masqué pendant la capture.",

    "projects.eyebrow": "Tableau de bord opérationnel",
    "projects.title": "Boîte de retours ChangeThis",
    "projects.lede": "Centralisez les feedbacks des sites, vérifiez le brouillon d'issue et envoyez-le vers la bonne destination GitHub ou GitLab.",
    "projects.testFeedback": "Envoyer un retour test",
    "projects.dashboard.updated": "Dernier signal",
    "projects.ops.label": "État production",
    "projects.ops.sites": "sites pilotes",
    "projects.ops.github": "vers GitHub",
    "projects.ops.gitlab": "vers GitLab",
    "projects.ops.feedbacks": "feedbacks persistants",
    "projects.metrics.label": "Synthèse des retours",
    "projects.metric.pending": "À traiter",
    "projects.metric.queued": "En file",
    "projects.metric.retries": "Relances",
    "projects.metric.failed": "Échecs à corriger",
    "projects.metric.sent": "Issues créées",
    "projects.signals.eyebrow": "Signaux",
    "projects.signals.title": "Vue opérationnelle",
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
    "projects.inbox.copy": "Priorisez les nouveaux feedbacks, relancez les erreurs récupérables et gardez les feedbacks ignorés hors de la file principale.",
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
    "projects.empty.copy": "Installez le widget sur un site connecté, envoyez un premier retour, puis traitez-le depuis cette boîte de réception. Les retours ignorés restent archivés et les nouveaux retours réapparaîtront ici.",
    "projects.empty.filtered.title": "Aucun retour pour cette vue",
    "projects.empty.filtered.copy": "Ajustez les filtres, passez en historique ou revenez à la file active.",
    "projects.empty.filtered.reset": "Réinitialiser les filtres",
    "projects.list.aria": "Retours à traiter",
    "projects.sites.aria": "Navigation par site connecté",
    "projects.sites.filterAria": "Filtrer les feedbacks par site",
    "projects.sites.all": "Tous les sites",
    "projects.summary.aria": "Synthèse opérationnelle",
    "projects.onboarding.aria": "Étapes pour activer la file de retours",
    "projects.tabs.aria": "Vue des retours",
    "projects.tabs.active": "File active",
    "projects.tabs.history": "Historique",
    "projects.tabs.all": "Tous",
    "projects.filters.status": "Statut",
    "projects.filters.site": "Site",
    "projects.filters.type": "Type",
    "projects.filters.git": "Git",
    "projects.filters.all": "Tous",
    "projects.filters.priority": "Action requise",
    "projects.filters.new": "Nouveaux",
    "projects.filters.queued": "En file",
    "projects.filters.toRetry": "À relancer",
    "projects.filters.failed": "Échecs",
    "projects.filters.created": "Issues créées",
    "projects.filters.resolved": "Résolus",
    "projects.filters.kept": "Conservés",
    "projects.filters.ignored": "Ignorés",
    "projects.feedback.sentBy": "Envoyé par",
    "projects.feedback.createdAtPrefix": "Le",
    "projects.feedback.details": "Brouillon, destination et contexte",
    "projects.feedback.demo": "Feedback de démonstration",
    "projects.feedback.issue.created": "Créée",
    "projects.feedback.issue.inProgress": "En cours",
    "projects.feedback.issue.notCreated": "Non créée",
    "projects.ops.eyebrow": "États et reprise",
    "projects.ops.title": "Ce que ChangeThis garde visible",
    "projects.ops.provider.title": "Erreur fournisseur",
    "projects.ops.provider.copy": "Le message d'erreur reste sur la carte. Si l'erreur est récupérable, une relance automatique est planifiée.",
    "projects.ops.manual.title": "Relance manuelle",
    "projects.ops.manual.copy": "Le bouton Relancer redémarre la création d'issue pour un feedback précis, sans dupliquer une issue déjà envoyée.",
    "projects.ops.archive.title": "Archive propre",
    "projects.ops.archive.copy": "Les feedbacks ignorés ne polluent plus l'inbox, mais restent conservés.",
    "projects.feedback.meta": "Métadonnées du retour",
    "projects.feedback.noMessage": "Aucun message fourni.",
    "projects.feedback.issueError": "Création d'issue impossible",
    "projects.feedback.nextRetry": "Nouvelle tentative possible à partir de",
    "projects.feedback.draft": "Brouillon d'issue",
    "projects.feedback.capture": "Capture",
    "projects.feedback.destination": "Destination",

    "destinations.message.initial": "Choisissez un site et un fournisseur GitHub ou GitLab, puis liez un dépôt cible.",
    "destinations.message.error": "Impossible de lier ce dépôt.",
    "destinations.message.missing": "sites sans destination.",
    "destinations.eyebrow": "Routage obligatoire",
    "destinations.title": "Chaque site choisit GitHub ou GitLab avant d'envoyer des issues",
    "destinations.configure": "Configurer",
    "destinations.connected": "Connecté",
    "destinations.toConnect": "À connecter",
    "destinations.verify": "Vérifier",
    "destinations.connect": "Connecter",
    "destinations.manage": "Gérer",
    "destinations.test.connection": "Tester la connexion",
    "destinations.test.running": "Test en cours...",
    "destinations.link.title": "Lier un site à son dépôt d'issues",
    "destinations.link.copy": "Cette configuration est enregistrée côté serveur et pilote la création réelle des issues depuis l'inbox.",
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
    "destinations.integration.gitlabCredentialHelp": "Ajoutez un token GitLab ou terminez la connexion OAuth avant de créer une issue.",

    "actions.issue.view": "Voir l'issue",
    "actions.issue.sync": "Synchroniser",
    "actions.ignored": "Ignoré",
    "actions.kept": "Conservé",
    "actions.keepFeedback": "Conserver sans issue",
    "actions.replay": "Relancer",
    "actions.create": "Créer l'issue",
    "actions.processing": "Traitement en cours...",
    "actions.ignore": "Ignorer",
    "actions.close": "Fermer",
    "issueComposer.title": "Préparer l'issue",
    "issueComposer.copy": "Modifiez le titre, complétez la description ou ajoutez votre réponse avant de créer l'issue Git.",
    "issueComposer.issueTitle": "Titre",
    "issueComposer.description": "Description ou commentaire",
    "issueComposer.labels": "Étiquettes",
    "issueComposer.labelsHint": "Séparez les étiquettes par des virgules.",
    "issueComposer.cancel": "Annuler",
    "issueComposer.submit": "Créer l'issue",
    "actions.error.impossible": "Action impossible pour le moment. Réessayez dans quelques secondes.",
    "actions.error.connection": "Connexion interrompue. Vérifiez le serveur local puis réessayez.",
    "home.aria.heroProof": "Repères produit ChangeThis",
    "home.aria.betaProof": "Repères bêta ouverte",
    "home.aria.activationSteps": "Étapes après inscription",
    "home.aria.mobilePair": "Aperçus mobiles ChangeThis côté visiteur et côté équipe",
    "home.aria.mobileVisitor": "Aperçu mobile visiteur ChangeThis",
    "home.aria.mobileTeam": "Aperçu mobile équipe ChangeThis",
    "home.aria.accessDetails": "Détails de l'accès ChangeThis",
    "home.aria.betaDetails": "Détails de la bêta ChangeThis",
    "home.mobile.mock.visitor.title": "Objets calmes pour maisons vivantes.",
    "home.mobile.mock.visitor.copy": "Une page client avec formulaire, collection et zones à commenter.",
    "home.mobile.mock.widget.title": "Retour",
    "home.mobile.mock.dashboard.kicker": "Tableau de bord opérationnel",
    "home.mobile.mock.dashboard.title": "Retours ChangeThis",
    "home.mobile.mock.dashboard.test": "Tester",
    "home.mobile.mock.dashboard.filterStatus": "Statut : action requise",
    "home.mobile.mock.dashboard.filterSite": "Site : tous",
    "home.mobile.mock.dashboard.filterGit": "Git : tous",
    "home.mobile.mock.feedback.first.title": "Repère sur /checkout",
    "home.mobile.mock.feedback.first.copy": "Le bouton devis est trop bas sur mobile.",
    "home.mobile.mock.feedback.first.meta": "Cabinet Orion · /checkout · il y a 4 min",
    "home.mobile.mock.feedback.second.title": "Capture sur /pricing",
    "home.mobile.mock.feedback.second.copy": "La carte Pro masque le détail du tarif annuel.",
    "home.mobile.mock.feedback.second.meta": "Studio Lumen · /pricing · il y a 18 min",
    "home.mobile.mock.summary": "Synthèse",
    "home.mobile.mock.currentQueue": "File actuelle",
    "home.mobile.mock.toTriage": "À qualifier",
    "home.mobile.mock.queued": "En file",
    "home.mobile.mock.resolved": "Résolu",
    "home.mobile.mock.connectedSites": "Sites connectés",
    "home.mobile.mock.gitReady": "GitHub prêt · GitLab configuré"
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
    "settings.users.copy": "Visitors can still submit feedback without an account. These accounts only grant access to the dashboard and feedback processing.",
    "footer.copy": "Turn every piece of customer feedback into a clear, contextual task that is ready to act on.",
    "footer.support": "Support",
    "footer.license": "License",
    "footer.creator": "Me contacter",
    "footer.gitAccounts": "Git accounts",
    "footer.status.openBeta": "Open beta",
    "footer.status.paused": "Limited access",
    "footer.runtime.production": "Production",
    "footer.runtime.local": "Local",
    "pause.eyebrow": "Reopening in preparation",
    "pause.title": "ChangeThis is preparing its next phase.",
    "pause.lede": "Public signups are temporarily closed while the service is being consolidated. The website remains available so you can discover the product and request updates.",
    "pause.card.title": "Public access temporarily closed",
    "pause.card.copy": "Account creation and public login are paused for now. Pilot access may be opened on request for interested teams.",
    "pause.contact": "Request pilot access",
    "pause.demo": "View demo",
    "pause.noStorage": "The contact button opens an external page. No email is collected or stored in ChangeThis during this period.",
    "login.eyebrow": "Dashboard access · open beta",
    "login.title": "Sign in to ChangeThis",
    "login.lede": "Sign in to access the dashboard. Signups can be open or temporarily paused depending on the environment.",
    "login.email": "Work email",
    "login.password": "Password",
    "login.submit": "Continue",
    "login.localSubmit": "Open local dashboard",
    "login.localMode.title": "Local mode active",
    "login.localMode.copy": "The local environment uses a non-destructive development session. The flow remains compatible with Supabase auth.",
    "login.error": "Sign-in is not available right now. Check your details and try again.",
    "login.redirectHint": "You will be redirected to the requested page after sign-in.",
    "login.noBackend": "Server authentication is unavailable in this environment.",
    "login.privateBeta.title": "Signups paused",
    "login.privateBeta.copy": "Signups can be temporarily closed during operations. Sign in with an existing account or try again later.",
    "auth.confirm.title": "Secure sign-in in progress",
    "auth.confirm.copy": "We are verifying the email link before finalizing your sign-in.",
    "signup.eyebrow": "Create an account",
    "signup.title": "Create your account with your email",
    "signup.lede": "Enter your work email. We will send a secure code to verify the address and let you choose your password.",
    "signup.organization": "Organization name",
    "signup.password": "Password",
    "signup.submit": "Send secure code",
    "signup.localSubmit": "Open local dashboard",
    "signup.redirectHint": "The email code lets you choose your password before opening the workspace.",
    "signup.loginHint": "Already have an account?",
    "login.signupHint": "Need an account?",
    "signup.error": "We cannot validate the request right now. Check the email or code and try again.",
    "signup.localMode.copy": "Local mode opens the setup dashboard directly without creating a remote account.",
    "signup.sent.title": "Check your inbox",
    "signup.sent.copy": "We sent a secure code. Paste it here to choose your password and create your ChangeThis workspace.",
    "signup.code": "Email code",
    "signup.codeHint": "The code is personal and expires quickly.",
    "signup.verifyCode": "Verify code",
    "signup.setPassword.eyebrow": "Email verified",
    "signup.setPassword.title": "Choose your password.",
    "signup.setPassword.lede": "Your email is verified. Create the password you will use for future sign-ins.",
    "signup.setPassword.password": "New password",
    "signup.setPassword.copy": "Your workspace is created automatically from your work email. You can rename the organization later.",
    "signup.setPassword.submit": "Create my workspace",
    "signup.setPassword.error": "We cannot create the password right now. Try again with a password of at least 8 characters.",
    "signup.proof.site": "Create your first site",
    "signup.proof.git": "Choose the Git repository",
    "signup.proof.widget": "Install the widget script",
    "nav.main": "Main navigation",
    "nav.project": "Project navigation",
    "nav.demo": "Demo navigation",
    "nav.inbox": "Inbox",
    "nav.demoWidget": "Widget demo",
    "nav.openConsole": "Open dashboard",
    "nav.language": "Language switcher",

    "home.workflow.1": "The feedback button keeps the message, page, screen size, marker, and screenshot.",
    "home.workflow.1.strong": "Full context.",
    "home.workflow.2": "Sort user feedback, add a comment, then decide what should go to GitHub or GitLab.",
    "home.workflow.2.strong": "Fast decision.",
    "home.workflow.3": "ChangeThis prepares a clear task in the GitHub or GitLab space linked to the site.",
    "home.workflow.3.strong": "Ready task.",
    "home.siteState.ready": "Ready",
    "home.siteState.configure": "Needs setup",
    "home.hero.eyebrow": "Open beta",
    "home.hero.statement": "Receive website feedback with useful context, then create the GitHub or GitLab issue when it is worth acting on.",
    "home.hero.statement.prefix": "Receive website feedback with useful context, then create the issue in",
    "home.hero.statement.or": "or",
    "home.hero.statement.suffix": " when it is worth acting on.",
    "home.hero.promise": "A feedback widget that turns every piece of website feedback into an actionable issue.",
    "home.hero.lede": "Install a feedback widget on a real site, centralize feedback in your team space, then send only useful items to Git.",
    "home.hero.primary": "Review feedback",
    "home.hero.signup": "Sign up",
    "home.hero.login": "Sign in",
    "home.hero.secondary": "Test the widget",
    "home.hero.trust": "Visitors can send feedback without an account. Only your team workspace requires sign-in.",
    "home.hero.proof.visitor": "No visitor account required",
    "home.hero.proof.context": "Page + screen + screenshot",
    "home.hero.proof.git": "GitHub or GitLab",
    "home.hero.proof.browser": "No Git token in the browser",
    "home.hero.privateBeta": "Controlled open beta: signups can be temporarily closed during operations.",
    "home.waitlist.callout.title": "Signups are paused",
    "home.waitlist.callout.copy": "Leave your work email. We will let you know when signups reopen.",
    "home.signup.callout.title": "Access is open",
    "home.signup.callout.copy": "Create the team space, connect a repository, and install the widget on your first site.",
    "home.console.callout.title": "You are signed in",
    "home.console.callout.copy": "Return to your feedback queue or finish configuring your connected sites.",
    "home.console.primary": "Open dashboard",
    "home.console.secondary": "Configure sites",
    "home.waitlist.label": "Work email",
    "home.waitlist.submit": "Notify me when signups reopen",
    "home.waitlist.status.joined": "You're on the list. We will let you know when signups reopen.",
    "home.waitlist.status.existing": "This email is already on the list. Your request is saved.",
    "home.waitlist.status.error": "We cannot add this email right now. Check it and try again.",
    "home.waitlist.point.1": "Connect a site.",
    "home.waitlist.point.2": "Install the script.",
    "home.waitlist.point.3": "Receive test feedback.",
    "home.waitlist.point.4": "Create the issue that matters.",
    "home.problem.eyebrow": "Why ChangeThis",
    "home.problem.title": "Useful website feedback gets lost before it reaches the right place.",
    "home.problem.question": "Less noise in Git.",
    "home.problem.intro": "ChangeThis keeps a review step between customer feedback and the Git repository, so teams avoid follow-ups, duplicates, and issues already handled.",
    "home.problem.point.1": "Feedback arrives through email, Slack, Teams, Word documents, or informal conversations.",
    "home.problem.point.2": "Teams miss the exact context: page, screen size, selected element, screenshot.",
    "home.problem.point.3": "Teams lose time rewriting feedback before creating a clear task.",
    "home.problem.example.1.source": "Scattered channels",
    "home.problem.example.1.reality": "Feedback arrives through email, Slack, Teams, Word documents, or conversations between meetings.",
    "home.problem.example.1.consequence": "The client wants to help, but the feedback quickly ends up in a document, a message, or an external note.",
    "home.problem.example.2.source": "Missing context",
    "home.problem.example.2.reality": "Someone mentions a button, but not the exact page, screen size, selected element, or screenshot.",
    "home.problem.example.2.consequence": "The team has to reconstruct the case before understanding what to fix.",
    "home.problem.example.3.source": "Missing filter",
    "home.problem.example.3.reality": "A small doubt quickly becomes a Git task, even when it only needs clarification or archiving.",
    "home.problem.example.3.consequence": "Without a simple review step before Git, the repository fills with noise before the real topics, sometimes with duplicates or issues already handled.",
    "home.beta.eyebrow": "What ChangeThis does",
    "home.beta.title": "Capture feedback, decide what to do with it, then prepare an actionable task.",
    "home.beta.capture.title": "Precisely located feedback",
    "home.beta.capture.copy": "Message, page, screen size, marker, and screenshot grouped into one feedback item.",
    "home.beta.inbox.title": "Clear inbox",
    "home.beta.inbox.copy": "Sort feedback before sending it to the right person or tool.",
    "home.beta.routing.title": "Task ready to process",
    "home.beta.routing.copy": "A clear draft with all useful context.",
    "home.beta.access.title": "Sites mapped to repositories",
    "home.beta.access.copy": "Each site can point to the right GitHub or GitLab repository.",
    "home.context.eyebrow": "Captured context",
    "home.context.title": "Feedback keeps the essentials.",
    "home.context.copy": "Page, device, marker, and destination stay attached to the feedback.",
    "home.context.page.title": "Exact page",
    "home.context.page.copy": "URL, page title, and the site linked to the feedback.",
    "home.context.device.title": "Device and screen",
    "home.context.device.copy": "Browser, system, and screen size to reproduce the right case.",
    "home.context.viewport.title": "Screen size",
    "home.context.viewport.copy": "Width, height, and display density to reproduce the right screen.",
    "home.context.message.title": "Visitor message",
    "home.context.message.copy": "Free-text note sent with the feedback, without a visitor account.",
    "home.context.pin.title": "Marker or capture",
    "home.context.pin.copy": "Pointed area, marker, or screenshot when the image helps explain it.",
    "home.context.capture.title": "Area screenshot",
    "home.context.capture.copy": "Image attached when a screenshot helps verify the issue.",
    "home.context.element.title": "Targeted element",
    "home.context.element.copy": "Selected element and visible text when the visitor points to a precise area.",
    "home.context.routing.title": "Review destination",
    "home.context.routing.copy": "Site, team space, and intended Git repository used to prepare the task.",
    "home.mobile.eyebrow": "Mobile experience",
    "home.mobile.title": "Feedback often starts on mobile. The context should follow.",
    "home.mobile.title.intro": "On small screens.",
    "home.mobile.title.impact": "Context stays actionable.",
    "home.mobile.copy": "For visitors, the button stays discreet. For teams, context arrives ready to process.",
    "home.mobile.point.visitor": "No visitor account",
    "home.mobile.point.team": "Team triage",
    "home.mobile.point.context": "Context ready to process",
    "home.mobile.label.visitor": "Visitor",
    "home.mobile.label.team": "Team",
    "home.publicSector.eyebrow": "Practical security",
    "home.publicSector.title": "The basics to check before installing the widget.",
    "home.publicSector.lede": "ChangeThis is not a security certification. The pilot should stay simple: know what data leaves the site, where it goes, and who can read it.",
    "home.publicSector.theme.accessibility.title": "No Git token on the site",
    "home.publicSector.theme.accessibility.copy": "The installed script contains no GitHub or GitLab token. Connections stay server-side, outside the browser.",
    "home.publicSector.theme.data.title": "Visible data",
    "home.publicSector.theme.data.copy": "Feedback can include URL, browser, viewport, message, markers, and a screenshot when the user adds one.",
    "home.publicSector.theme.pilot.title": "Per-site control",
    "home.publicSector.theme.pilot.copy": "Each site has its allowed origins, Git destination, and widget settings.",
    "home.publicSector.notReplace.title": "Check before going live",
    "home.publicSector.notReplace.audit": "No Git token in the script or browser.",
    "home.publicSector.notReplace.support": "Allowed domains limited to the real sites involved.",
    "home.publicSector.notReplace.certification": "Dashboard access reserved for the people handling feedback.",
    "home.publicSector.pilotScope.title": "Document clearly",
    "home.publicSector.pilotScope.pages": "Covered pages.",
    "home.publicSector.pilotScope.screenshots": "Screenshot usage and tester information.",
    "home.publicSector.pilotScope.retention": "Planned retention period.",
    "home.publicSector.pilotScope.review": "Team owner.",
    "home.workflow.capture.title": "The visitor reports an issue",
    "home.workflow.capture.copy": "They add a note, point to an area, or request a screenshot without creating an account.",
    "home.workflow.triage.title": "The team triages",
    "home.workflow.triage.copy": "The team space groups feedback by site, state, and destination so decisions stay quick.",
    "home.workflow.issue.title": "The issue goes to the right place",
    "home.workflow.issue.copy": "Useful context follows the Git task instead of getting lost in a chat thread.",
    "home.beta.scope.eyebrow": "Open beta scope",
    "home.beta.scope.title.main": "Open now.",
    "home.beta.note.1": "Visitors do not need an account to send feedback.",
    "home.beta.note.2": "Find your repositories in the team workspace to connect each site to the right project.",
    "home.beta.note.3": "Works on desktop, mobile, and tablet.",
    "home.closing.eyebrow": "First site",
    "home.closing.title.small": "Configure your",
    "home.closing.title.main": "first site",
    "home.closing.copy": "Create your space, link a Git repository, and install the widget to verify the full flow on a real site.",
    "home.closing.proof.beta": "Open access",
    "home.closing.proof.visitors": "Feedback without visitor accounts",
    "home.closing.proof.git": "GitHub or GitLab",
    "home.closing.panel.title": "Configure your first site in a few steps.",
    "home.closing.panel.copy": "The dashboard guides the link between allowed domain, Git repository, and first actionable feedback.",
    "home.closing.step.site.title": "Connected site",
    "home.closing.step.site.copy": "Add the allowed domain and get the widget tag.",
    "home.closing.step.git.title": "Git repo selected",
    "home.closing.step.git.copy": "Link each site to the repository that will receive its issues.",
    "home.closing.step.feedback.title": "First feedback received",
    "home.closing.step.feedback.copy": "Send a test, check the context, and create the issue.",
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
    "home.product.retry.copy": "Feedback items that need recovery stay visible, can be replayed manually, and can later be automated through the retry route.",
    "home.workflow.eyebrow": "Product flow",
    "home.workflow.title": "Install, review, create",
    "home.signup.eyebrow": "Open beta",
    "home.signup.title": "Team space, connected sites, feedback widget: ready to install.",
    "home.signup.copy": "The open beta can accept new accounts when signups are enabled for the environment. The demo remains a sandbox, not proof of a live customer setup.",
    "home.signup.primary": "Sign in",
    "home.signup.secondary": "View demo",
    "home.install.eyebrow": "Installation",
    "home.install.title": "One line of code per site, one public key per project.",
    "home.install.strong": "Simple install.",
    "home.install.copy": "The test code follows the same path as production. The demo page lets you test the full flow without a customer account.",
    "home.preview.label": "ChangeThis dashboard preview",
    "home.preview.badge": "Beta preview",
    "home.preview.private": "Open beta access",
    "home.preview.metric.signal": "client signal",
    "home.preview.metric.viewport": "mobile",
    "home.preview.metric.destination": "prepared",
    "home.preview.draft.eyebrow": "Draft",
    "home.preview.context.page": "Page",
    "home.preview.context.viewport": "Screen",
    "home.preview.context.type": "Type",
    "home.preview.context.received": "Received",
    "home.preview.route.eyebrow": "Routing",
    "home.preview.route.title": "Ready for an issue",
    "home.preview.sidebar.sites": "Sites",
    "home.preview.sidebar.integrations": "Integrations",
    "home.preview.header": "Incoming feedback",
    "home.preview.recent": "recent",
    "home.preview.empty.title": "No feedback yet",
    "home.preview.empty.copy": "Install the widget on a connected site to populate this space.",
    "home.preview.ready": "ready",
    "home.loop.aria": "ChangeThis journey preview",
    "home.loop.section.eyebrow": "Product flow",
    "home.loop.section.title": "Install the widget, capture context, create the issue.",
    "home.loop.section.copy": "The flow keeps feedback actionable: connected site, captured context, and a draft ready for GitHub or GitLab.",
    "home.loop.setup.eyebrow": "Install",
    "home.loop.setup.title": "Install the widget on the dev or pilot site.",
    "home.loop.script.aria": "ChangeThis script example",
    "home.loop.git.title": "Task destinations",
    "home.loop.visitor.eyebrow": "Capture",
    "home.loop.visitor.title": "The visitor reports the problem with:",
    "home.loop.visitor.point.page": "the page",
    "home.loop.visitor.point.capture": "a precise area capture",
    "home.loop.visitor.point.pin": "a precise marker",
    "home.loop.fakeSite.title": "Booking portal",
    "home.loop.fakeSite.subtitle": "Mobile checkout",
    "home.loop.widget.note": "Note",
    "home.loop.widget.marker": "Marker",
    "home.loop.widget.capture": "Capture",
    "home.loop.widget.copy": "The quote button sits too low on mobile.",
    "home.loop.widget.send": "Send",
    "home.loop.developer.eyebrow": "Triage",
    "home.loop.developer.title": "The team receives the context and creates the right issue.",
    "home.loop.inbox.active": "To triage",
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

    "status.raw": "new",
    "status.raw.long": "New",
    "status.issue_creation_pending": "in progress",
    "status.issue_creation_pending.long": "Creation in progress",
    "status.retrying": "retrying",
    "status.retrying.long": "Retry scheduled",
    "status.sent_to_provider": "sent",
    "status.sent_to_provider.long": "Sent",
    "status.failed": "failed",
    "status.failed.long": "Provider error",
    "status.kept": "kept",
    "status.kept.long": "Kept",
    "status.resolved": "resolved",
    "status.resolved.long": "Resolved",
    "status.ignored": "ignored",
    "status.ignored.long": "Ignored",

    "demo.eyebrow": "Widget sandbox",
    "demo.title": "Customer test site",
    "demo.statement": "Use the Feedback button in the bottom-right corner to send feedback to the local inbox.",
    "demo.lede": "This page loads the local widget bundle and local API. Feedback is saved in the persistent inbox, then can be sent to GitHub or GitLab based on the site destination.",
    "demo.badge": "Customer staging",
    "demo.content.title": "Contact page redesign",
    "demo.content.copy": "The visitor can click anywhere on this page, point to a visual element, add a note, or request a viewport screenshot.",
    "demo.cta.primary": "Request a quote",
    "demo.cta.secondary": "View services",
    "demo.scenarios.title": "Scenarios to test",
    "demo.scenarios.1": "Simple note on content",
    "demo.scenarios.2": "Pin on the main button",
    "demo.scenarios.3": "Screenshot with sensitive fields masked",
    "demo.email": "Client email",
    "demo.privateComment": "Private comment",
    "demo.privateValue": "This field should be masked during capture.",

    "projects.eyebrow": "Operational dashboard",
    "projects.title": "ChangeThis inbox",
    "projects.lede": "Centralize site feedback, review the issue draft, and send it to the right GitHub or GitLab destination.",
    "projects.testFeedback": "Send test feedback",
    "projects.dashboard.updated": "Latest signal",
    "projects.ops.label": "Production status",
    "projects.ops.sites": "pilot sites",
    "projects.ops.github": "to GitHub",
    "projects.ops.gitlab": "to GitLab",
    "projects.ops.feedbacks": "persistent feedback items",
    "projects.metrics.label": "Inbox summary",
    "projects.metric.pending": "To triage",
    "projects.metric.queued": "Queued",
    "projects.metric.retries": "Retries",
    "projects.metric.failed": "Failures to fix",
    "projects.metric.sent": "Issues created",
    "projects.signals.eyebrow": "Signals",
    "projects.signals.title": "Operational view",
    "projects.signals.queue": "Active queue",
    "projects.signals.queue.copy": "feedback items visible outside the archive.",
    "projects.signals.latest": "Latest signal",
    "projects.signals.latest.copy": "date of the most recent feedback received.",
    "projects.signals.latest.empty": "no feedback received.",
    "projects.signals.routing": "Git routing",
    "projects.signals.routing.copy": "GitHub sites / GitLab sites configured.",
    "projects.signals.archive": "Archive",
    "projects.signals.archive.copy": "ignored feedback kept for reference.",
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
    "projects.queue.done.copy": "issues already created.",
    "projects.empty.title": "No active feedback",
    "projects.empty.copy": "Install the widget on a connected site, send the first feedback, then process it from this inbox. Ignored feedback stays archived and new feedback will reappear here.",
    "projects.empty.filtered.title": "No feedback for this view",
    "projects.empty.filtered.copy": "Adjust the filters, switch to History, or return to the Active queue.",
    "projects.empty.filtered.reset": "Reset filters",
    "projects.list.aria": "Feedback to process",
    "projects.sites.aria": "Connected site navigation",
    "projects.sites.filterAria": "Filter feedback by site",
    "projects.sites.all": "All sites",
    "projects.summary.aria": "Operational summary",
    "projects.onboarding.aria": "Steps to activate the feedback queue",
    "projects.tabs.aria": "Feedback view",
    "projects.tabs.active": "Active queue",
    "projects.tabs.history": "History",
    "projects.tabs.all": "All",
    "projects.filters.status": "Status",
    "projects.filters.site": "Site",
    "projects.filters.type": "Type",
    "projects.filters.git": "Git",
    "projects.filters.all": "All",
    "projects.filters.priority": "Action required",
    "projects.filters.new": "New",
    "projects.filters.queued": "Queued",
    "projects.filters.toRetry": "To retry",
    "projects.filters.failed": "Failures",
    "projects.filters.created": "Issues created",
    "projects.filters.resolved": "Resolved",
    "projects.filters.kept": "Kept",
    "projects.filters.ignored": "Ignored",
    "projects.feedback.sentBy": "Sent by",
    "projects.feedback.createdAtPrefix": "Created",
    "projects.feedback.details": "Draft, destination, and context",
    "projects.feedback.demo": "Demo feedback",
    "projects.feedback.issue.created": "Created",
    "projects.feedback.issue.inProgress": "In progress",
    "projects.feedback.issue.notCreated": "Not created",
    "projects.ops.eyebrow": "States and recovery",
    "projects.ops.title": "What ChangeThis keeps visible",
    "projects.ops.provider.title": "Provider error",
    "projects.ops.provider.copy": "The error message stays on the card. If the error is recoverable, an automatic retry is scheduled.",
    "projects.ops.manual.title": "Manual retry",
    "projects.ops.manual.copy": "The Replay button restarts issue creation for one specific feedback without duplicating an already sent issue.",
    "projects.ops.archive.title": "Clean archive",
    "projects.ops.archive.copy": "Ignored feedback no longer clutters the inbox, but remains available.",
    "projects.feedback.meta": "Feedback metadata",
    "projects.feedback.noMessage": "No message provided.",
    "projects.feedback.issueError": "Issue creation failed",
    "projects.feedback.nextRetry": "Next retry available after",
    "projects.feedback.draft": "Issue draft",
    "projects.feedback.capture": "Screenshot",
    "projects.feedback.destination": "Destination",

    "destinations.message.initial": "Choose a site and a GitHub or GitLab provider, then link a target repository.",
    "destinations.message.error": "Unable to link this repository.",
    "destinations.message.missing": "sites without a destination.",
    "destinations.eyebrow": "Required routing",
    "destinations.title": "Each site must choose GitHub or GitLab before sending issues",
    "destinations.configure": "Configure",
    "destinations.connected": "Connected",
    "destinations.toConnect": "Not connected",
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
    "destinations.integration.credentials": "Server credentials",
    "destinations.integration.ready": "Ready",
    "destinations.integration.connectUnavailable": "Configuration required",
    "destinations.integration.githubConnectionHelp": "Configure a GitHub App to enable the connection button.",
    "destinations.integration.githubCredentialHelp": "Add a GitHub token or GitHub App credentials before creating an issue.",
    "destinations.integration.gitlabConnectionHelp": "Configure a GitLab OAuth application to enable the connection button.",
    "destinations.integration.gitlabCredentialHelp": "Add a GitLab token or complete OAuth before creating an issue.",

    "actions.issue.view": "View issue",
    "actions.issue.sync": "Refresh status",
    "actions.ignored": "Ignored",
    "actions.kept": "Kept",
    "actions.keepFeedback": "Keep without creating an issue",
    "actions.replay": "Retry",
    "actions.create": "Create issue",
    "actions.processing": "Processing...",
    "actions.ignore": "Ignore",
    "actions.close": "Close",
    "issueComposer.title": "Prepare issue",
    "issueComposer.copy": "Edit the title, complete the description, or add your reply before creating the issue in Git.",
    "issueComposer.issueTitle": "Title",
    "issueComposer.description": "Description or comment",
    "issueComposer.labels": "Labels",
    "issueComposer.labelsHint": "Separate labels with commas.",
    "issueComposer.cancel": "Cancel",
    "issueComposer.submit": "Create issue",
    "actions.error.impossible": "This action is not available right now. Try again in a few seconds.",
    "actions.error.connection": "Connection interrupted. Check the local server, then try again.",
    "home.aria.heroProof": "ChangeThis product markers",
    "home.aria.betaProof": "Open beta markers",
    "home.aria.activationSteps": "Post-signup steps",
    "home.aria.mobilePair": "ChangeThis mobile previews for visitor and team",
    "home.aria.mobileVisitor": "ChangeThis visitor mobile preview",
    "home.aria.mobileTeam": "ChangeThis team mobile preview",
    "home.aria.accessDetails": "ChangeThis access details",
    "home.aria.betaDetails": "ChangeThis beta details",
    "home.mobile.mock.visitor.title": "Calm objects for lived-in homes.",
    "home.mobile.mock.visitor.copy": "A customer page with a form, collection, and areas to comment on.",
    "home.mobile.mock.widget.title": "Feedback",
    "home.mobile.mock.dashboard.kicker": "Operational dashboard",
    "home.mobile.mock.dashboard.title": "ChangeThis feedback",
    "home.mobile.mock.dashboard.test": "Test",
    "home.mobile.mock.dashboard.filterStatus": "Status: action required",
    "home.mobile.mock.dashboard.filterSite": "Site: all",
    "home.mobile.mock.dashboard.filterGit": "Git: all",
    "home.mobile.mock.feedback.first.title": "Marker on /checkout",
    "home.mobile.mock.feedback.first.copy": "The quote button is too low on mobile.",
    "home.mobile.mock.feedback.first.meta": "Cabinet Orion · /checkout · 4 min ago",
    "home.mobile.mock.feedback.second.title": "Screenshot on /pricing",
    "home.mobile.mock.feedback.second.copy": "The Pro card hides the annual pricing details.",
    "home.mobile.mock.feedback.second.meta": "Studio Lumen · /pricing · 18 min ago",
    "home.mobile.mock.summary": "Summary",
    "home.mobile.mock.currentQueue": "Current queue",
    "home.mobile.mock.toTriage": "To triage",
    "home.mobile.mock.queued": "Queued",
    "home.mobile.mock.resolved": "Resolved",
    "home.mobile.mock.connectedSites": "Connected sites",
    "home.mobile.mock.gitReady": "GitHub ready · GitLab configured"
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
    const savedSource = window.localStorage.getItem(storageSourceKey);
    const initialLocale = isLocale(savedLocale) && savedSource === "manual"
      ? savedLocale
      : inferBrowserLocale(window.navigator.languages, window.navigator.language);

    window.setTimeout(() => setLocaleState(initialLocale), 0);
    window.localStorage.setItem(storageKey, initialLocale);
    window.localStorage.setItem(storageSourceKey, savedSource === "manual" ? "manual" : "browser");
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === "fr" ? "fr-BE" : "en";
  }, [locale]);

  const value = useMemo<LanguageContextValue>(() => ({
    locale,
    setLocale: (nextLocale) => {
      setLocaleState(nextLocale);
      window.localStorage.setItem(storageKey, nextLocale);
      window.localStorage.setItem(storageSourceKey, "manual");
    },
    t: (key) => dictionaries[locale][key] ?? dictionaries.fr[key] ?? key
  }), [locale]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

function inferBrowserLocale(languages: readonly string[] | undefined, fallbackLanguage: string | undefined): Locale {
  const candidates = languages && languages.length > 0 ? languages : [fallbackLanguage ?? ""];
  const browserLocale = candidates.find((item) => item.trim().length > 0)?.toLowerCase() ?? "";

  return browserLocale.startsWith("fr") ? "fr" : "en";
}

function isLocale(value: string | null): value is Locale {
  return value === "fr" || value === "en";
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
      case "home.hero.promise":
        return <>A feedback <span className="tech-word">widget</span> that turns every web return into an actionable <span className="tech-word">issue</span>.</>;
      case "home.hero.statement.prefix":
        return <>Receive feedback from your sites with useful context, then create the <span className="tech-word">issue</span> in</>;
      case "home.hero.lede":
        return <>Install a feedback <span className="tech-word">widget</span> on a real site, centralize returns in your team workspace, then send only useful topics to <span className="tech-word">Git</span>.</>;
      case "home.hero.proof.git":
        return <><span className="tech-word">GitHub</span>{" "}or{" "}<span className="tech-word">GitLab</span></>;
      case "home.hero.proof.browser":
        return <>No token{" "}<span className="tech-word">Git</span>{" "}in the browser</>;
      case "home.waitlist.point.2":
        return <>Install the <span className="tech-word">script</span>.</>;
      case "home.waitlist.point.4":
        return <>Create the useful <span className="tech-word">issue</span>.</>;
      case "home.waitlist.callout.copy":
        return <>Enter your work email to start or receive access <strong>as soon as a seat is available</strong>.</>;
      case "home.signup.callout.copy":
        return <>Create your team space and start connecting <strong>your sites</strong> now.</>;
      case "home.problem.point.1":
        return <>Feedback arrives through <strong>email, Slack, Teams</strong>, Word documents, or <strong>informal conversations</strong>.</>;
      case "home.problem.title":
        return <>Useful website feedback gets lost <strong>before it reaches the right place</strong>.</>;
      case "home.problem.point.2":
        return <>Teams miss the exact context: <strong>page, screen size</strong>, selected element, screenshot.</>;
      case "home.problem.point.3":
        return <>Teams lose time rewriting feedback before creating <strong>a clear task</strong>.</>;
      case "home.problem.example.1.reality":
        return <>Feedback arrives through <strong>email, Slack, Teams</strong>, Word documents, or <strong>conversations between meetings</strong>.</>;
      case "home.problem.example.1.consequence":
        return <>The client wants to help, but the feedback quickly ends up in <strong>a document, a message, or an external note</strong>.</>;
      case "home.problem.example.2.reality":
        return <>Someone mentions a button, but not the exact <strong>page, screen size, selected element</strong>, or screenshot.</>;
      case "home.problem.example.2.consequence":
        return <>The team has to reconstruct the case before <strong>understanding what to fix</strong>.</>;
      case "home.problem.intro":
        return <>ChangeThis keeps a review step between customer feedback and the <span className="tech-word">Git</span> repository, to avoid back-and-forth, duplicates, and already handled <span className="tech-word">issues</span>.</>;
      case "home.problem.example.3.reality":
        return <>A small doubt quickly becomes <strong>a Git task</strong>, even when it only needs clarification or archiving.</>;
      case "home.problem.example.3.consequence":
        return <>Without a <strong>simple review step before Git</strong>, the repository fills with noise before the real topics, sometimes with duplicates or issues already handled.</>;
      case "home.beta.capture.copy":
        return <>Message, page, screen size, marker, and screenshot grouped into <strong>one feedback item</strong>.</>;
      case "home.beta.inbox.copy":
        return <>Sort feedback before sending it to <strong>the right person</strong> or <strong>the right tool</strong>.</>;
      case "home.beta.routing.copy":
        return <>A clear draft with <strong>all useful context</strong>.</>;
      case "home.beta.access.copy":
        return <>Each site can point to <strong>the right GitHub or GitLab repository</strong>.</>;
      case "home.context.routing.copy":
        return <>Site, team workspace, and planned <span className="tech-word">Git</span> repository stay ready for the task.</>;
      case "home.mobile.copy":
        return <>For visitors, the button stays discreet.<br />For teams, context arrives <strong>ready to process</strong>.</>;
      case "home.workflow.capture.copy":
        return <>They add a note, point to an area, or request a screenshot <strong>without creating an account</strong>.</>;
      case "home.workflow.triage.copy":
        return <>The team space groups feedback by <strong>site, state, and destination</strong> so decisions stay quick.</>;
      case "home.workflow.issue.copy":
        return <>Useful context follows the Git task instead of getting lost in <strong>a chat thread</strong>.</>;
      case "home.beta.note.1":
        return <>Visitors do not need an account to <strong>send feedback</strong>.</>;
      case "home.beta.note.2":
        return <>Find your repositories in the team workspace to connect each site to <strong>the right project</strong>.</>;
      case "home.beta.note.3":
        return <>Works on <strong>desktop, mobile, and tablet</strong>.</>;
      case "home.closing.copy":
        return <>Create your team workspace to prepare your first site: <span className="tech-word">script</span> to install, feedback to review, <span className="tech-word">Git</span> issues to send.</>;
      default:
        return undefined;
    }
  }

  switch (key) {
    case "home.hero.promise":
      return <>Un <span className="tech-word">widget</span> de feedback qui transforme chaque retour web en <span className="tech-word">issue</span> exploitable.</>;
    case "home.hero.statement.prefix":
      return <>Recevez les feedbacks de vos sites avec le contexte utile, puis créez l&apos;<span className="tech-word">issue</span> dans</>;
    case "home.hero.lede":
      return <>Installez un <span className="tech-word">widget</span> de feedback sur un vrai site, centralisez les feedbacks dans votre espace équipe, puis envoyez seulement les sujets utiles vers <span className="tech-word">Git</span>.</>;
    case "home.hero.proof.git":
      return <><span className="tech-word">GitHub</span>{" "}ou{" "}<span className="tech-word">GitLab</span></>;
    case "home.hero.proof.browser":
      return <>Aucun token{" "}<span className="tech-word">Git</span>{" "}côté navigateur</>;
    case "home.waitlist.point.2":
      return <>Installer le <span className="tech-word">script</span>.</>;
    case "home.waitlist.point.4":
      return <>Créer l&apos;<span className="tech-word">issue</span> utile.</>;
    case "home.waitlist.callout.copy":
      return <>Entrez votre e-mail professionnel pour démarrer ou recevoir un accès <strong>dès qu&apos;une place est disponible</strong>.</>;
    case "home.signup.callout.copy":
      return <>Créez votre espace équipe et commencez à connecter <strong>vos sites</strong> dès maintenant.</>;
    case "home.problem.point.1":
      return <>Les feedbacks arrivent par <strong>e-mail, Slack, Teams</strong>, document Word ou <strong>discussion informelle</strong>.</>;
    case "home.problem.title":
      return <>Les retours web utiles se perdent <strong>avant d&apos;arriver au bon endroit</strong>.</>;
    case "home.problem.point.2":
      return <>Les équipes manquent du contexte exact{"\u00a0"}: <strong>page, taille d&apos;écran</strong>, élément visé, capture.</>;
    case "home.problem.point.3":
      return <>Les équipes perdent du temps à reformuler avant même de créer <strong>une tâche claire</strong>.</>;
    case "home.problem.example.1.reality":
      return <>Un feedback arrive par <strong>e-mail, Slack, Teams</strong>, document Word ou <strong>discussion entre deux réunions</strong>.</>;
    case "home.problem.example.1.consequence":
      return <>Le client veut aider, mais le feedback finit trop vite dans <strong>un document, un message ou une note externe</strong>.</>;
    case "home.problem.example.2.reality":
      return <>On parle d&apos;un bouton, mais pas de la <strong>page exacte</strong>, de la <strong>taille d&apos;écran</strong>, ni de <strong>l&apos;élément visé</strong>.</>;
    case "home.problem.example.2.consequence":
      return <>L&apos;équipe doit rejouer la scène avant même de <strong>comprendre quoi corriger</strong>.</>;
    case "home.problem.intro":
      return <>ChangeThis garde une étape de tri entre le retour client et le dépôt <span className="tech-word">Git</span>, pour éviter les allers-retours, les doublons et les <span className="tech-word">issues</span> déjà traitées.</>;
    case "home.problem.example.3.reality":
      return <>Un petit doute devient vite <strong>une tâche Git</strong>, même quand il faudrait juste clarifier ou archiver.</>;
    case "home.problem.example.3.consequence":
      return <>Sans <strong>tri simple avant Git</strong>, le dépôt se remplit de bruit avant les vrais sujets, parfois avec des doublons ou des issues déjà traitées.</>;
    case "home.beta.capture.copy":
      return <>Message, page, taille d&apos;écran, repère et capture réunis dans <strong>un seul feedback</strong>.</>;
    case "home.beta.inbox.copy":
      return <>Triez les retours avant de les envoyer à <strong>la bonne personne</strong> ou <strong>au bon outil</strong>.</>;
    case "home.beta.routing.copy":
      return <>Un brouillon clair avec <strong>tout le contexte utile</strong>.</>;
    case "home.beta.access.copy":
      return <>Chaque site peut pointer vers <strong>le bon dépôt GitHub ou GitLab</strong>.</>;
    case "home.context.routing.copy":
      return <>Site, espace d&apos;équipe et dépôt <span className="tech-word">Git</span> prévu pour préparer la tâche.</>;
    case "home.mobile.copy":
      return <>Côté visiteur, le bouton reste discret.<br />Côté équipe, le contexte arrive <strong>prêt à traiter</strong>.</>;
    case "home.workflow.capture.copy":
      return <>Il ajoute une note, pointe une zone ou demande une capture <strong>sans créer de compte</strong>.</>;
    case "home.workflow.triage.copy":
      return <>L&apos;espace équipe regroupe les feedbacks par <strong>site, état et destination</strong> pour décider vite.</>;
    case "home.workflow.issue.copy":
      return <>Le contexte utile accompagne la tâche Git, au lieu de rester perdu dans <strong>un fil de discussion</strong>.</>;
    case "home.beta.note.1":
      return <>Les visiteurs n&apos;ont pas besoin de compte pour <strong>envoyer un retour</strong>.</>;
    case "home.beta.note.2":
      return <>Retrouvez vos dépôts dans l&apos;espace d&apos;équipe pour relier chaque site au <strong>bon projet</strong>.</>;
    case "home.beta.note.3":
      return <>Fonctionne sur <strong>ordinateur, mobile et tablette</strong>.</>;
    case "home.closing.copy":
      return <>Créez votre espace pour préparer votre premier site{"\u00a0"}: <span className="tech-word">script</span> à installer, retours à qualifier, tâches <span className="tech-word">Git</span> à envoyer.</>;
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
