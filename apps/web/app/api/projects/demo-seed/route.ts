import { buildIssueDraft, type FeedbackPayload, type IssueTarget } from "@changethis/shared";
import { NextResponse } from "next/server";
import { authFailureResponse, isAuthFailure, requireWorkspaceRole, requireWorkspaceSession } from "../../../../lib/auth";
import { requirePrivateMutationOrigin } from "../../../../lib/api-security";
import { getProviderCredentialSecret, saveProviderCredentialSecret } from "../../../../lib/credential-store";
import { demoProviderTokens } from "../../../../lib/demo-provider-data";
import { getFeedbackRepository } from "../../../../lib/feedback-repository";
import { enableProviderIntegration } from "../../../../lib/provider-integration-state";
import { getProviderIntegration } from "../../../../lib/provider-integrations";
import { createConnectedSite, listConfiguredProjects } from "../../../../lib/project-registry";
import { isProductionRuntime } from "../../../../lib/runtime";

const seedRunId = "realistic-demo-seed-v3-status-showcase";

type SeedSite = {
  name: string;
  allowedOrigin: string;
  provider: "github" | "gitlab";
  repositoryUrl: string;
};

const seedSites: SeedSite[] = [
  {
    name: "Atelier Nova - Portail client",
    allowedOrigin: "https://staging.portal-atelier-nova.example",
    provider: "github",
    repositoryUrl: "https://github.com/atelier-nova/portal-staging"
  },
  {
    name: "Studio Lumen - Shop vitrine",
    allowedOrigin: "https://shop.studio-lumen.example",
    provider: "gitlab",
    repositoryUrl: "https://gitlab.com/studio-lumen/shopfront"
  },
  {
    name: "Cabinet Orion - Espace rendez-vous",
    allowedOrigin: "https://rdv.cabinet-orion.example",
    provider: "github",
    repositoryUrl: "https://github.com/cabinet-orion/booking-portal"
  }
];

const seedFeedbacks = [
  {
    siteName: "Atelier Nova - Portail client",
    type: "screenshot",
    path: "/appointments/new",
    title: "Nouveau rendez-vous - mobile",
    message: "Julien: sur iPhone, le bouton Continuer est partiellement caché par le bas de l'écran.",
    scenario: "mobile-footer-overlap",
    viewport: [390, 844],
    captureArea: { x: 0, y: 520, width: 390, height: 280 },
    status: "raw"
  },
  {
    siteName: "Atelier Nova - Portail client",
    type: "pin",
    path: "/appointments/booking/confirm",
    title: "Confirmation rendez-vous",
    message: "Nadia: quand je choisis le créneau de 14h30 puis que je clique sur Confirmer, le bouton reste en chargement.",
    scenario: "appointment-booking-blocker",
    viewport: [1440, 900],
    pin: { x: 972, y: 612, selector: "button[type='submit']", text: "Confirmer" },
    status: "failed"
  },
  {
    siteName: "Atelier Nova - Portail client",
    type: "comment",
    path: "/billing/payment-method",
    title: "Moyen de paiement",
    message: "Emma: quand la carte est refusée, le message dit seulement \"Une erreur est survenue\". Il faudrait expliquer quoi faire.",
    scenario: "billing-copy-confusion",
    viewport: [1366, 768],
    status: "raw"
  },
  {
    siteName: "Atelier Nova - Portail client",
    type: "pin",
    path: "/patients/documents",
    title: "Documents patient",
    message: "Samir: le bouton Télécharger semble désactivé alors qu'il fonctionne.",
    scenario: "visual-affordance",
    viewport: [1366, 768],
    pin: { x: 1040, y: 356, selector: ".document-row button", text: "Télécharger" },
    status: "issue_creation_pending"
  },
  {
    siteName: "Atelier Nova - Portail client",
    type: "screenshot",
    path: "/login",
    title: "Connexion patient",
    message: "Nadia: le message d'erreur de connexion disparaît trop vite pour être lu.",
    scenario: "login-error-toast",
    viewport: [1440, 900],
    captureArea: { x: 420, y: 220, width: 520, height: 360 },
    status: "retrying"
  },
  {
    siteName: "Atelier Nova - Portail client",
    type: "comment",
    path: "/settings/notifications",
    title: "Préférences notifications",
    message: "Laura: je ne comprends pas si le rappel part par e-mail ou par SMS.",
    scenario: "notification-channel-copy",
    viewport: [1280, 800],
    status: "sent_to_provider"
  },
  {
    siteName: "Atelier Nova - Portail client",
    type: "pin",
    path: "/appointments/calendar",
    title: "Calendrier rendez-vous",
    message: "Mehdi: les créneaux indisponibles ressemblent trop aux créneaux libres.",
    scenario: "calendar-availability-contrast",
    viewport: [1536, 864],
    pin: { x: 716, y: 402, selector: ".calendar-slot.disabled", text: "15:00" },
    status: "kept"
  },
  {
    siteName: "Studio Lumen - Shop vitrine",
    type: "pin",
    path: "/product/linen-jacket",
    title: "Fiche produit - veste lin",
    message: "Patrick: le bouton Ajouter au panier est trop bas sur desktop, on le rate au premier regard.",
    scenario: "product-cta-visibility",
    viewport: [1512, 982],
    pin: { x: 1180, y: 780, selector: "[data-testid='add-to-cart']", text: "Ajouter au panier" },
    status: "raw"
  },
  {
    siteName: "Studio Lumen - Shop vitrine",
    type: "screenshot",
    path: "/checkout",
    title: "Checkout",
    message: "Jean-Pierre: le résumé commande saute visuellement quand je change la livraison.",
    scenario: "checkout-layout-shift",
    viewport: [412, 915],
    captureArea: { x: 0, y: 190, width: 412, height: 520 },
    status: "retrying"
  },
  {
    siteName: "Studio Lumen - Shop vitrine",
    type: "comment",
    path: "/",
    title: "Accueil boutique",
    message: "Claire: le hero donne envie, mais on ne comprend pas assez vite la livraison offerte.",
    scenario: "homepage-value-prop",
    viewport: [1440, 900],
    status: "sent_to_provider"
  },
  {
    siteName: "Studio Lumen - Shop vitrine",
    type: "pin",
    path: "/cart",
    title: "Panier",
    message: "Aline: je ne trouve pas où appliquer mon code promo.",
    scenario: "coupon-field-hidden",
    viewport: [1366, 768],
    pin: { x: 982, y: 312, selector: ".discount-toggle", text: "Code promo" },
    status: "failed"
  },
  {
    siteName: "Studio Lumen - Shop vitrine",
    type: "screenshot",
    path: "/checkout/shipping",
    title: "Livraison checkout",
    message: "Thomas: le choix du point relais sort de l'écran sur tablette.",
    scenario: "shipping-pickup-tablet-overflow",
    viewport: [834, 1112],
    captureArea: { x: 80, y: 260, width: 680, height: 620 },
    status: "issue_creation_pending"
  },
  {
    siteName: "Studio Lumen - Shop vitrine",
    type: "comment",
    path: "/product/wool-scarf",
    title: "Fiche produit - écharpe",
    message: "Sophie: je ne vois pas clairement si le produit est disponible en boutique.",
    scenario: "store-availability-missing",
    viewport: [1440, 900],
    status: "resolved"
  },
  {
    siteName: "Studio Lumen - Shop vitrine",
    type: "pin",
    path: "/account/orders",
    title: "Historique commandes",
    message: "Patrick: le lien de suivi colis est trop discret.",
    scenario: "tracking-link-affordance",
    viewport: [1440, 900],
    pin: { x: 1120, y: 428, selector: ".order-tracking-link", text: "Suivre" },
    status: "ignored"
  },
  {
    siteName: "Cabinet Orion - Espace rendez-vous",
    type: "pin",
    path: "/appointments/booking/confirm",
    title: "Validation rendez-vous",
    message: "Jean-Pierre: après validation, je ne sais pas si mon rendez-vous est bien enregistré.",
    scenario: "booking-confirmation-feedback",
    viewport: [1366, 768],
    pin: { x: 918, y: 542, selector: ".confirmation-summary", text: "Rendez-vous" },
    status: "raw"
  },
  {
    siteName: "Cabinet Orion - Espace rendez-vous",
    type: "comment",
    path: "/login",
    title: "Connexion patient",
    message: "Nadia: après trois essais, je ne sais pas comment récupérer mon accès.",
    scenario: "resolved-login-copy",
    viewport: [1440, 900],
    status: "resolved"
  },
  {
    siteName: "Cabinet Orion - Espace rendez-vous",
    type: "screenshot",
    path: "/patients/profile",
    title: "Profil patient",
    message: "Fatima: le bouton Enregistrer est sous le clavier sur Android.",
    scenario: "android-keyboard-save-hidden",
    viewport: [393, 873],
    captureArea: { x: 0, y: 430, width: 393, height: 360 },
    status: "raw"
  },
  {
    siteName: "Cabinet Orion - Espace rendez-vous",
    type: "pin",
    path: "/patients/invoices",
    title: "Factures patient",
    message: "Marc: l'état Payée n'est pas assez visible dans la liste.",
    scenario: "invoice-paid-status-contrast",
    viewport: [1280, 800],
    pin: { x: 864, y: 286, selector: ".invoice-status-paid", text: "Payée" },
    status: "sent_to_provider"
  },
  {
    siteName: "Cabinet Orion - Espace rendez-vous",
    type: "comment",
    path: "/messages",
    title: "Messagerie patient",
    message: "Elise: je ne sais pas si mon message au secrétariat a bien été envoyé.",
    scenario: "message-sent-confirmation",
    viewport: [1366, 768],
    status: "kept"
  },
  {
    siteName: "Cabinet Orion - Espace rendez-vous",
    type: "screenshot",
    path: "/appointments/reschedule",
    title: "Déplacer un rendez-vous",
    message: "Olivier: sur mobile, les boutons Annuler et Confirmer sont trop proches.",
    scenario: "reschedule-mobile-button-spacing",
    viewport: [390, 844],
    captureArea: { x: 0, y: 560, width: 390, height: 220 },
    status: "ignored"
  },
  {
    siteName: "Cabinet Orion - Espace rendez-vous",
    type: "comment",
    path: "/help",
    title: "Aide patient",
    message: "Claire: la page d'aide répond aux questions générales, mais pas au changement de rendez-vous.",
    scenario: "help-content-gap",
    viewport: [1440, 900],
    status: "sent_to_provider"
  }
] as const;

export async function POST(request: Request) {
  if (isProductionRuntime) {
    return NextResponse.json({ error: "Demo seed is disabled in production" }, { status: 403 });
  }

  const session = requireWorkspaceRole(await requireWorkspaceSession(request), "admin");

  if (isAuthFailure(session)) {
    return authFailureResponse(session);
  }

  const workspaceId = session.workspace?.id;
  if (!workspaceId) {
    return authFailureResponse({ error: "Workspace access required", status: 403 });
  }

  const csrfFailure = requirePrivateMutationOrigin(request);

  if (csrfFailure) {
    return csrfFailure;
  }

  const repository = getFeedbackRepository();
  const createdConnections = seedDemoProviderConnections(workspaceId);
  const existingFeedbacks = await repository.list({ workspaceId });
  if (existingFeedbacks.some((feedback) => feedback.payload.metadata.app?.testRunId === seedRunId)) {
    return NextResponse.json({ skipped: true, createdSites: 0, createdFeedbacks: 0, createdConnections });
  }

  let projects = await listConfiguredProjects(workspaceId);
  let createdSites = 0;

  for (const site of seedSites) {
    if (!projects.some((project) => project.name === site.name)) {
      await createConnectedSite({
        name: site.name,
        allowedOrigin: site.allowedOrigin,
        provider: site.provider,
        repositoryUrl: site.repositoryUrl,
        workspaceId,
        widgetButtonVariant: site.name.includes("Shop") ? "subtle" : "default"
      });
      createdSites += 1;
      projects = await listConfiguredProjects(workspaceId);
    }
  }

  let createdFeedbacks = 0;

  for (const item of seedFeedbacks) {
    const project = projects.find((candidate) => candidate.name === item.siteName);
    if (!project) {
      continue;
    }

    const payload = buildPayload(project.publicKey, project.allowedOrigins[0], item);
    const feedback = await repository.create({
      projectKey: project.publicKey,
      projectName: project.name,
      issueTarget: project.issueTarget,
      payload,
      issueDraft: buildIssueDraft(payload),
      screenshotDataUrl: payload.screenshotDataUrl,
      workspaceId
    });

    await applySeedStatus(feedback.id, project.issueTarget, item.status, workspaceId);
    createdFeedbacks += 1;
  }

  return NextResponse.json({ skipped: false, createdSites, createdFeedbacks, createdConnections });
}

function seedDemoProviderConnections(workspaceId: string): number {
  let createdConnections = 0;

  for (const provider of ["github", "gitlab"] as const) {
    const integration = getProviderIntegration(provider, undefined, workspaceId);

    if (!integration) {
      continue;
    }

    const existingToken = getProviderCredentialSecret(provider, integration.id, "access_token", workspaceId);

    if (!existingToken && !integration.environmentCredentialConfigured) {
      saveProviderCredentialSecret({
        workspaceId,
        provider,
        integrationId: integration.id,
        kind: "access_token",
        value: demoProviderTokens[provider],
        scopes: provider === "github" ? ["repo"] : ["api", "read_user"]
      });
      createdConnections += 1;
    }

    enableProviderIntegration(provider, integration.id, workspaceId);
  }

  return createdConnections;
}

function buildPayload(
  projectKey: string,
  origin: string,
  item: typeof seedFeedbacks[number]
): FeedbackPayload {
  const now = new Date().toISOString();
  const [width, height] = item.viewport;

  return {
    projectKey,
    type: item.type,
    message: item.message,
    metadata: {
      url: `${origin}${item.path}`,
      origin,
      path: item.path,
      title: item.title,
      userAgent: userAgentForViewport(width),
      viewport: { width, height },
      scroll: { x: 0, y: item.type === "screenshot" ? 240 : 0 },
      screen: {
        width,
        height,
        availableWidth: width,
        availableHeight: height - 40,
        colorDepth: 24,
        pixelDepth: 24
      },
      devicePixelRatio: width < 600 ? 3 : 1,
      language: "fr-BE",
      timezone: "Europe/Brussels",
      online: true,
      app: {
        environment: "staging",
        release: "2026.04.30-rc1",
        appVersion: "0.1.0-staging",
        buildId: "realistic-demo-build-001",
        commitSha: "0000000",
        branch: "demo/staging-simulated-client",
        testRunId: seedRunId,
        scenario: item.scenario,
        customer: "atelier-nova-demo"
      },
      createdAt: now
    },
    pin: "pin" in item ? item.pin : undefined,
    pins: "pin" in item ? [item.pin] : undefined,
    captureArea: "captureArea" in item ? item.captureArea : undefined,
    screenshotDataUrl: item.type === "screenshot" ? demoScreenshotDataUrl(item.title, item.path, width, height) : undefined
  };
}

function demoScreenshotDataUrl(title: string, path: string, width: number, height: number): string {
  const safeTitle = escapeSvg(title);
  const safePath = escapeSvg(path);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#f6f8fb"/>
  <rect x="24" y="24" width="${Math.max(220, width - 48)}" height="54" rx="8" fill="#ffffff" stroke="#d8dee8"/>
  <text x="44" y="58" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#172033">${safeTitle}</text>
  <rect x="24" y="104" width="${Math.max(220, width - 48)}" height="${Math.max(180, height - 150)}" rx="10" fill="#ffffff" stroke="#d8dee8"/>
  <text x="44" y="142" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#2563eb">Capture demo ChangeThis</text>
  <text x="44" y="172" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#172033">${safePath}</text>
  <rect x="${Math.max(44, width * 0.58)}" y="${Math.max(190, height * 0.58)}" width="140" height="42" rx="8" fill="#2563eb"/>
  <text x="${Math.max(64, width * 0.58 + 20)}" y="${Math.max(216, height * 0.58 + 26)}" font-family="Arial, sans-serif" font-size="14" font-weight="700" fill="#ffffff">Action cible</text>
  <circle cx="${Math.max(38, width * 0.78)}" cy="${Math.max(120, height * 0.42)}" r="16" fill="#dc2626"/>
  <text x="${Math.max(33, width * 0.78 - 5)}" y="${Math.max(126, height * 0.42 + 6)}" font-family="Arial, sans-serif" font-size="16" font-weight="800" fill="#ffffff">1</text>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeSvg(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function applySeedStatus(id: string, issueTarget: IssueTarget, status: typeof seedFeedbacks[number]["status"], workspaceId: string) {
  const repository = getFeedbackRepository();

  if (status === "raw") {
    return;
  }

  if (status === "issue_creation_pending") {
    await repository.markIssueCreationPending(id, { workspaceId });
    return;
  }

  if (status === "failed") {
    await repository.recordIssueAttempt(id, {
      ok: false,
      error: "Simulation: permission insuffisante pour créer l'issue dans ce dépôt.",
      retryable: false
    }, { workspaceId });
    return;
  }

  if (status === "retrying") {
    await repository.recordIssueAttempt(id, {
      ok: false,
      error: "Simulation: timeout provider, nouvelle tentative planifiée.",
      retryable: true,
      nextRetryAt: new Date(Date.now() - 60_000).toISOString()
    }, { workspaceId });
    return;
  }

  if (status === "sent_to_provider") {
    await repository.recordIssueAttempt(id, {
      ok: true,
      externalIssue: {
        provider: issueTarget.provider,
        number: issueTarget.provider === "github" ? 42 : undefined,
        iid: issueTarget.provider === "gitlab" ? 42 : undefined,
        url: `${issueTarget.webUrl}/issues/42`,
        state: "open"
      }
    }, { workspaceId });
    return;
  }

  if (status === "resolved") {
    await repository.recordExternalIssueState(id, {
      provider: issueTarget.provider,
      number: issueTarget.provider === "github" ? 77 : undefined,
      iid: issueTarget.provider === "gitlab" ? 77 : undefined,
      url: `${issueTarget.webUrl}/issues/77`,
      state: "closed"
    }, { workspaceId });
    return;
  }

  if (status === "kept") {
    await repository.markKept(id, { workspaceId });
    return;
  }

  if (status === "ignored") {
    await repository.markIgnored(id, { workspaceId });
  }
}

function userAgentForViewport(width: number): string {
  if (width < 600) {
    return "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
  }

  return "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
}
