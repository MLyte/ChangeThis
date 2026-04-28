"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Languages } from "lucide-react";

export type Locale = "fr" | "en";

type Dictionary = Record<string, string>;

const storageKey = "changethis:preferredLanguage";

const dictionaries: Record<Locale, Dictionary> = {
  fr: {
    "nav.logout": "Se déconnecter",
    "nav.localMode": "Mode local",
    "nav.issues": "Issues",
    "nav.connectedSites": "Sites connectés",
    "nav.settings": "Paramètres",
    "settings.eyebrow": "Paramètres",
    "settings.title": "Paramètres",
    "settings.sidebar.label": "Sections des paramètres",
    "settings.sidebar.gitConnections": "Connexions Git",
    "settings.sidebar.connectedSites": "Sites connectés",
    "settings.gitConnections.title": "Connexions Git",
    "footer.copy": "Feedbacks, connexions Git et scripts d'installation au même endroit.",
    "footer.gitAccounts": "Comptes Git",
    "login.eyebrow": "Accès console",
    "login.title": "Connexion ChangeThis",
    "login.lede": "Connectez-vous pour accéder à l'inbox produit et transformer les retours clients en issues exploitables.",
    "login.email": "Email professionnel",
    "login.password": "Mot de passe",
    "login.submit": "Continuer",
    "login.localSubmit": "Ouvrir la console locale",
    "login.localMode.title": "Mode local actif",
    "login.localMode.copy": "L'environnement local utilise une session de développement non destructive. Le flux reste compatible avec l'auth Supabase.",
    "login.error": "Connexion impossible pour le moment. Vérifiez vos informations puis réessayez.",
    "login.redirectHint": "Vous serez redirigé vers la page demandée après connexion.",
    "login.noBackend": "Authentification serveur indisponible dans cet environnement.",
    "nav.main": "Navigation principale",
    "nav.project": "Navigation projet",
    "nav.demo": "Navigation démo",
    "nav.inbox": "Inbox",
    "nav.demoWidget": "Démo widget",
    "nav.openConsole": "Ouvrir la console",
    "nav.language": "Sélecteur de langue",

    "home.workflow.1": "Le widget capture le message, l'URL, le viewport, le pin et la capture.",
    "home.workflow.2": "L'inbox qualifie le retour, affiche le brouillon et garde l'historique de retry.",
    "home.workflow.3": "ChangeThis crée l'issue dans le repo GitHub ou GitLab lié au site.",
    "home.siteState.ready": "Prêt",
    "home.siteState.configure": "À configurer",
    "home.metric.actionable": "Retours à traiter",
    "home.metric.sites": "Sites configurés",
    "home.metric.retries": "Retries en attente",
    "home.hero.eyebrow": "Console feedback",
    "home.hero.statement": "Une inbox produit pour transformer les retours clients en issues GitHub ou GitLab exploitables.",
    "home.hero.lede": "Installez le widget sur chaque site, reliez le site à son repo, puis traitez les retours entrants avec contexte complet, brouillon d'issue et retries visibles.",
    "home.hero.primary": "Traiter l'inbox",
    "home.hero.secondary": "Envoyer un retour test",
    "home.ops.label": "État opérationnel",
    "home.product.eyebrow": "Première vue utilisable",
    "home.product.title": "Tout ce qu'il faut pour passer du signal client à l'action.",
    "home.product.inbox.title": "Inbox durable",
    "home.product.inbox.copy": "Les retours restent disponibles après redémarrage, avec statuts, erreurs provider et prochain retry.",
    "home.product.config.title": "Configuration par site",
    "home.product.config.copy": "Chaque clé publique garde ses origines autorisées et son repo cible GitHub ou GitLab.",
    "home.product.draft.title": "Brouillon lisible",
    "home.product.draft.copy": "L'issue contient message, page, viewport, langue, labels, pin, capture et données techniques.",
    "home.product.retry.title": "Reprise contrôlée",
    "home.product.retry.copy": "Les échecs d'API sont visibles, rejouables manuellement, puis automatisables via la route de retries.",
    "home.workflow.eyebrow": "Flux produit",
    "home.workflow.title": "Un circuit court, mais traçable.",
    "home.install.eyebrow": "Installation widget",
    "home.install.title": "Une balise par site, une clé publique par projet.",
    "home.install.copy": "Le bundle local expose le même chemin que la production. La page démo permet de tester le flux complet sans compte client.",
    "home.preview.label": "Aperçu de la console ChangeThis",
    "home.preview.sidebar.sites": "Sites",
    "home.preview.sidebar.integrations": "Intégrations",
    "home.preview.header": "Retours entrants",
    "home.preview.recent": "récents",
    "home.preview.empty.title": "Aucun feedback pour le moment",
    "home.preview.empty.copy": "Envoyez un retour depuis la démo widget pour alimenter cette console.",
    "home.preview.ready": "prêt",

    "status.raw": "à créer",
    "status.raw.long": "À créer",
    "status.issue_creation_pending": "en cours",
    "status.issue_creation_pending.long": "Création en cours",
    "status.retrying": "retry",
    "status.retrying.long": "Retry planifié",
    "status.sent_to_provider": "envoyé",
    "status.sent_to_provider.long": "Envoyé",
    "status.failed": "échec",
    "status.failed.long": "Échec provider",
    "status.ignored": "ignoré",
    "status.ignored.long": "Ignoré",

    "demo.eyebrow": "Bac à sable widget",
    "demo.title": "Site client de test",
    "demo.statement": "Utilisez le bouton Feedback en bas à droite pour créer un retour dans l'inbox locale.",
    "demo.lede": "Cette page charge le bundle widget local et l'API locale. Les retours arrivent dans l'inbox durable, puis peuvent être envoyés vers GitHub ou GitLab selon la destination configurée pour le site.",
    "demo.badge": "Staging client",
    "demo.content.title": "Refonte page contact",
    "demo.content.copy": "Le client peut cliquer n'importe où sur cette page, pointer un élément visuel, ajouter une note, ou demander une capture du viewport.",
    "demo.cta.primary": "Demander un devis",
    "demo.cta.secondary": "Voir les services",
    "demo.scenarios.title": "Scénarios à tester",
    "demo.scenarios.1": "Note simple sur le contenu",
    "demo.scenarios.2": "Pin sur le bouton principal",
    "demo.scenarios.3": "Capture avec champs sensibles masqués",
    "demo.email": "Email client",
    "demo.privateComment": "Commentaire privé",
    "demo.privateValue": "Ce champ doit être masqué pendant la capture.",

    "projects.eyebrow": "Console opérationnelle",
    "projects.title": "Inbox ChangeThis",
    "projects.lede": "Centralisez les retours des sites, contrôlez le brouillon d'issue et envoyez-le vers la bonne destination GitHub ou GitLab.",
    "projects.testFeedback": "Envoyer un retour test",
    "projects.ops.label": "État production",
    "projects.ops.sites": "sites pilotes",
    "projects.ops.github": "vers GitHub",
    "projects.ops.gitlab": "vers GitLab",
    "projects.ops.feedbacks": "feedbacks durables",
    "projects.metrics.label": "Synthèse de l'inbox",
    "projects.metric.pending": "À traiter",
    "projects.metric.retries": "Retries",
    "projects.metric.failed": "Échecs fixes requis",
    "projects.metric.sent": "Issues créées",
    "projects.inbox.eyebrow": "Retours collectés",
    "projects.inbox.title": "File de traitement",
    "projects.inbox.copy": "Priorisez les nouveaux retours, rejouez les erreurs récupérables et gardez les retours ignorés hors de la file principale.",
    "projects.inbox.label": "État de l'inbox",
    "projects.inbox.pending": "à traiter",
    "projects.inbox.test": "Tester le widget",
    "projects.inbox.retryDue": "Rejouer les retries dus",
    "projects.empty.title": "Aucun retour actif",
    "projects.empty.copy": "Envoyez un feedback depuis la démo pour créer une première carte inbox. Les retours ignorés restent archivés et les nouveaux feedbacks réapparaîtront ici.",
    "projects.ops.eyebrow": "États et reprise",
    "projects.ops.title": "Ce que ChangeThis garde visible",
    "projects.ops.provider.title": "Erreur provider",
    "projects.ops.provider.copy": "Le message d'erreur reste sur la carte. Si l'erreur est récupérable, un retry automatique est planifié.",
    "projects.ops.manual.title": "Retry manuel",
    "projects.ops.manual.copy": "Le bouton Rejouer relance la création d'issue pour un feedback précis, sans dupliquer une issue déjà envoyée.",
    "projects.ops.archive.title": "Archive propre",
    "projects.ops.archive.copy": "retour(s) ignoré(s) ne polluent plus l'inbox, mais restent dans le store local.",
    "projects.feedback.meta": "Métadonnées du feedback",
    "projects.feedback.noMessage": "Aucun message fourni.",
    "projects.feedback.issueError": "Création d'issue impossible",
    "projects.feedback.nextRetry": "Prochain essai automatique",
    "projects.feedback.draft": "Brouillon issue",
    "projects.feedback.capture": "Capture",
    "projects.feedback.destination": "Destination",

    "destinations.message.initial": "Choisissez un site, GitHub ou GitLab, puis liez un repository cible.",
    "destinations.message.error": "Impossible de lier ce repository.",
    "destinations.message.missing": "site(s) sans destination.",
    "destinations.eyebrow": "Routage obligatoire",
    "destinations.title": "Chaque site choisit GitHub ou GitLab avant d'envoyer une issue",
    "destinations.configure": "Configurer",
    "destinations.connected": "Connecté",
    "destinations.toConnect": "À connecter",
    "destinations.verify": "Vérifier",
    "destinations.connect": "Connecter",
    "destinations.manage": "Gérer",
    "destinations.link.title": "Lier un site à son repo d'issues",
    "destinations.link.copy": "Cette configuration est sauvegardée côté serveur et pilote la création réelle des issues depuis l'inbox.",
    "destinations.site": "Site",
    "destinations.provider": "Provider",
    "destinations.repository": "Repository cible",
    "destinations.linking": "Liaison...",
    "destinations.save": "Sauvegarder",
    "destinations.sites.eyebrow": "Sites pilotes",
    "destinations.sites.title": "Un choix provider explicite par site",
    "destinations.ready": "Prêt pour créer des issues",
    "destinations.required": "Configuration requise",
    "destinations.open": "Ouvrir",
    "destinations.integration.connectFlow": "Connexion guidée",
    "destinations.integration.credentials": "Credential serveur",
    "destinations.integration.ready": "Prêt",
    "destinations.integration.connectUnavailable": "Configuration requise",
    "destinations.integration.localTest": "Test local rapide",
    "destinations.integration.githubConnectionHelp": "Configurez une GitHub App pour activer le bouton de connexion.",
    "destinations.integration.githubCredentialHelp": "Ajoutez un token GitHub ou les credentials de GitHub App avant de créer une issue.",
    "destinations.integration.githubLocalHelp": "Le plus direct en local: un token avec Issues en lecture/écriture sur le repo cible.",
    "destinations.integration.gitlabConnectionHelp": "Configurez une application OAuth GitLab pour activer le bouton de connexion.",
    "destinations.integration.gitlabCredentialHelp": "Ajoutez un token GitLab ou terminez OAuth avant de créer une issue.",
    "destinations.integration.gitlabLocalHelp": "Le plus direct en local: un token personnel avec accès API au projet cible.",

    "actions.issue.view": "Voir l'issue",
    "actions.ignored": "Ignoré",
    "actions.replay": "Rejouer",
    "actions.create": "Créer l'issue",
    "actions.processing": "Traitement...",
    "actions.ignore": "Ignorer",
    "actions.close": "Fermer",
    "actions.error.impossible": "Action impossible pour le moment. Réessayez dans quelques secondes.",
    "actions.error.connection": "Connexion interrompue. Vérifiez le serveur local puis réessayez."
  },
  en: {
    "nav.logout": "Log out",
    "nav.localMode": "Local mode",
    "nav.issues": "Issues",
    "nav.connectedSites": "Connected sites",
    "nav.settings": "Settings",
    "settings.eyebrow": "Settings",
    "settings.title": "Settings",
    "settings.sidebar.label": "Settings sections",
    "settings.sidebar.gitConnections": "Git connections",
    "settings.sidebar.connectedSites": "Connected sites",
    "settings.gitConnections.title": "Git connections",
    "footer.copy": "Feedback, Git connections and install scripts in one place.",
    "footer.gitAccounts": "Git accounts",
    "login.eyebrow": "Console access",
    "login.title": "Sign in to ChangeThis",
    "login.lede": "Sign in to access the product inbox and turn client feedback into actionable issues.",
    "login.email": "Work email",
    "login.password": "Password",
    "login.submit": "Continue",
    "login.localSubmit": "Open local console",
    "login.localMode.title": "Local mode active",
    "login.localMode.copy": "The local environment uses a non-destructive development session. The flow remains compatible with Supabase auth.",
    "login.error": "Sign-in is not available right now. Check your details and try again.",
    "login.redirectHint": "You will be redirected to the requested page after sign-in.",
    "login.noBackend": "Server authentication is unavailable in this environment.",
    "nav.main": "Main navigation",
    "nav.project": "Project navigation",
    "nav.demo": "Demo navigation",
    "nav.inbox": "Inbox",
    "nav.demoWidget": "Widget demo",
    "nav.openConsole": "Open console",
    "nav.language": "Language switcher",

    "home.workflow.1": "The widget captures the message, URL, viewport, pin and screenshot.",
    "home.workflow.2": "The inbox qualifies the feedback, shows the draft and keeps retry history.",
    "home.workflow.3": "ChangeThis creates the issue in the GitHub or GitLab repo linked to the site.",
    "home.siteState.ready": "Ready",
    "home.siteState.configure": "To configure",
    "home.metric.actionable": "Feedback to triage",
    "home.metric.sites": "Configured sites",
    "home.metric.retries": "Pending retries",
    "home.hero.eyebrow": "Feedback console",
    "home.hero.statement": "A product inbox that turns client feedback into actionable GitHub or GitLab issues.",
    "home.hero.lede": "Install the widget on each site, link the site to its repo, then process incoming feedback with full context, an issue draft and visible retries.",
    "home.hero.primary": "Process inbox",
    "home.hero.secondary": "Send test feedback",
    "home.ops.label": "Operational status",
    "home.product.eyebrow": "Usable first view",
    "home.product.title": "Everything needed to move from client signal to action.",
    "home.product.inbox.title": "Durable inbox",
    "home.product.inbox.copy": "Feedback stays available after restarts, with statuses, provider errors and the next retry.",
    "home.product.config.title": "Per-site configuration",
    "home.product.config.copy": "Each public key keeps its allowed origins and its target GitHub or GitLab repo.",
    "home.product.draft.title": "Readable draft",
    "home.product.draft.copy": "The issue includes message, page, viewport, language, labels, pin, screenshot and technical data.",
    "home.product.retry.title": "Controlled recovery",
    "home.product.retry.copy": "API failures are visible, manually replayable, then automatable through the retries route.",
    "home.workflow.eyebrow": "Product flow",
    "home.workflow.title": "A short loop, but traceable.",
    "home.install.eyebrow": "Widget installation",
    "home.install.title": "One tag per site, one public key per project.",
    "home.install.copy": "The local bundle exposes the same path as production. The demo page lets you test the full flow without a client account.",
    "home.preview.label": "ChangeThis console preview",
    "home.preview.sidebar.sites": "Sites",
    "home.preview.sidebar.integrations": "Integrations",
    "home.preview.header": "Incoming feedback",
    "home.preview.recent": "recent",
    "home.preview.empty.title": "No feedback yet",
    "home.preview.empty.copy": "Send feedback from the widget demo to populate this console.",
    "home.preview.ready": "ready",

    "status.raw": "to create",
    "status.raw.long": "To create",
    "status.issue_creation_pending": "in progress",
    "status.issue_creation_pending.long": "Creation in progress",
    "status.retrying": "retry",
    "status.retrying.long": "Retry scheduled",
    "status.sent_to_provider": "sent",
    "status.sent_to_provider.long": "Sent",
    "status.failed": "failed",
    "status.failed.long": "Provider failed",
    "status.ignored": "ignored",
    "status.ignored.long": "Ignored",

    "demo.eyebrow": "Widget sandbox",
    "demo.title": "Test client site",
    "demo.statement": "Use the Feedback button in the bottom-right corner to create feedback in the local inbox.",
    "demo.lede": "This page loads the local widget bundle and local API. Feedback lands in the durable inbox, then can be sent to GitHub or GitLab depending on the configured site destination.",
    "demo.badge": "Client staging",
    "demo.content.title": "Contact page redesign",
    "demo.content.copy": "The client can click anywhere on this page, point to a visual element, add a note, or request a viewport screenshot.",
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
    "projects.lede": "Centralize site feedback, review the issue draft and send it to the right GitHub or GitLab destination.",
    "projects.testFeedback": "Send test feedback",
    "projects.ops.label": "Production status",
    "projects.ops.sites": "pilot sites",
    "projects.ops.github": "to GitHub",
    "projects.ops.gitlab": "to GitLab",
    "projects.ops.feedbacks": "durable feedback",
    "projects.metrics.label": "Inbox summary",
    "projects.metric.pending": "To triage",
    "projects.metric.retries": "Retries",
    "projects.metric.failed": "Fixed failures needed",
    "projects.metric.sent": "Issues created",
    "projects.inbox.eyebrow": "Collected feedback",
    "projects.inbox.title": "Processing queue",
    "projects.inbox.copy": "Prioritize new feedback, replay recoverable errors and keep ignored feedback out of the main queue.",
    "projects.inbox.label": "Inbox status",
    "projects.inbox.pending": "to triage",
    "projects.inbox.test": "Test widget",
    "projects.inbox.retryDue": "Replay due retries",
    "projects.empty.title": "No active feedback",
    "projects.empty.copy": "Send feedback from the demo to create the first inbox card. Ignored feedback stays archived and new feedback will reappear here.",
    "projects.ops.eyebrow": "States and recovery",
    "projects.ops.title": "What ChangeThis keeps visible",
    "projects.ops.provider.title": "Provider error",
    "projects.ops.provider.copy": "The error message stays on the card. If the error is recoverable, an automatic retry is scheduled.",
    "projects.ops.manual.title": "Manual retry",
    "projects.ops.manual.copy": "The Replay button restarts issue creation for one specific feedback without duplicating an already sent issue.",
    "projects.ops.archive.title": "Clean archive",
    "projects.ops.archive.copy": "ignored feedback item(s) no longer pollute the inbox, but remain in the local store.",
    "projects.feedback.meta": "Feedback metadata",
    "projects.feedback.noMessage": "No message provided.",
    "projects.feedback.issueError": "Issue creation impossible",
    "projects.feedback.nextRetry": "Next automatic attempt",
    "projects.feedback.draft": "Issue draft",
    "projects.feedback.capture": "Screenshot",
    "projects.feedback.destination": "Destination",

    "destinations.message.initial": "Choose a site, GitHub or GitLab, then link a target repository.",
    "destinations.message.error": "Unable to link this repository.",
    "destinations.message.missing": "site(s) without a destination.",
    "destinations.eyebrow": "Required routing",
    "destinations.title": "Each site chooses GitHub or GitLab before sending an issue",
    "destinations.configure": "Configure",
    "destinations.connected": "Connected",
    "destinations.toConnect": "To connect",
    "destinations.verify": "Verify",
    "destinations.connect": "Connect",
    "destinations.manage": "Manage",
    "destinations.link.title": "Link a site to its issue repo",
    "destinations.link.copy": "This configuration is saved server-side and drives real issue creation from the inbox.",
    "destinations.site": "Site",
    "destinations.provider": "Provider",
    "destinations.repository": "Target repository",
    "destinations.linking": "Linking...",
    "destinations.save": "Save",
    "destinations.sites.eyebrow": "Pilot sites",
    "destinations.sites.title": "One explicit provider choice per site",
    "destinations.ready": "Ready to create issues",
    "destinations.required": "Configuration required",
    "destinations.open": "Open",
    "destinations.integration.connectFlow": "Guided connection",
    "destinations.integration.credentials": "Server credential",
    "destinations.integration.ready": "Ready",
    "destinations.integration.connectUnavailable": "Configuration required",
    "destinations.integration.localTest": "Quick local test",
    "destinations.integration.githubConnectionHelp": "Configure a GitHub App to enable the connection button.",
    "destinations.integration.githubCredentialHelp": "Add a GitHub token or GitHub App credentials before creating an issue.",
    "destinations.integration.githubLocalHelp": "Fastest locally: a token with read/write Issues access on the target repo.",
    "destinations.integration.gitlabConnectionHelp": "Configure a GitLab OAuth application to enable the connection button.",
    "destinations.integration.gitlabCredentialHelp": "Add a GitLab token or complete OAuth before creating an issue.",
    "destinations.integration.gitlabLocalHelp": "Fastest locally: a personal token with API access to the target project.",

    "actions.issue.view": "View issue",
    "actions.ignored": "Ignored",
    "actions.replay": "Replay",
    "actions.create": "Create issue",
    "actions.processing": "Processing...",
    "actions.ignore": "Ignore",
    "actions.close": "Close",
    "actions.error.impossible": "Action is not possible right now. Try again in a few seconds.",
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

export function LanguageSwitch() {
  const { locale, setLocale, t } = useLanguage();

  return (
    <div className="language-switch" role="group" aria-label={t("nav.language")}>
      <span className="language-icon" aria-hidden="true">
        <Languages className="ui-icon muted-icon" size={15} strokeWidth={2.2} />
      </span>
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
