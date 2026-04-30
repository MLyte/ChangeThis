import { buildIssueDraft, type FeedbackPayload, type IssueTarget } from "@changethis/shared";
import { NextResponse } from "next/server";
import { authFailureResponse, isAuthFailure, requireWorkspaceRole, requireWorkspaceSession } from "../../../../lib/auth";
import { getFeedbackRepository } from "../../../../lib/feedback-repository";
import { createConnectedSite, listConfiguredProjects } from "../../../../lib/project-registry";

const seedRunId = "realistic-demo-seed-v1";

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
    type: "pin",
    path: "/appointments/booking/confirm",
    title: "Confirmer un rendez-vous - Atelier Nova",
    message: "Nadia: quand je choisis le créneau de 14h30 puis que je clique sur Confirmer, le bouton reste en chargement.",
    scenario: "appointment-booking-blocker",
    viewport: [1440, 900],
    pin: { x: 972, y: 612, selector: "button[type='submit']", text: "Confirmer" },
    status: "failed"
  },
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
    type: "comment",
    path: "/billing/payment-method",
    title: "Moyen de paiement",
    message: "Emma: quand la carte est refusée, le message dit seulement \"Une erreur est survenue\". Il faudrait expliquer quoi faire.",
    scenario: "billing-copy-confusion",
    viewport: [1366, 768],
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
    status: "sent_to_provider"
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
    status: "ignored"
  },
  {
    siteName: "Cabinet Orion - Espace rendez-vous",
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
    siteName: "Cabinet Orion - Espace rendez-vous",
    type: "comment",
    path: "/login",
    title: "Connexion patient",
    message: "Nadia: après résolution, le message d'erreur de connexion est beaucoup plus clair.",
    scenario: "resolved-login-copy",
    viewport: [1440, 900],
    status: "resolved"
  }
] as const;

export async function POST(request: Request) {
  if (process.env.VERCEL_ENV === "production") {
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

  const repository = getFeedbackRepository();
  const existingFeedbacks = await repository.list({ workspaceId });
  if (existingFeedbacks.some((feedback) => feedback.payload.metadata.app?.testRunId === seedRunId)) {
    return NextResponse.json({ skipped: true, createdSites: 0, createdFeedbacks: 0 });
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
      workspaceId
    });

    await applySeedStatus(feedback.id, project.issueTarget, item.status, workspaceId);
    createdFeedbacks += 1;
  }

  return NextResponse.json({ skipped: false, createdSites, createdFeedbacks });
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
    captureArea: "captureArea" in item ? item.captureArea : undefined
  };
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
      nextRetryAt: new Date(Date.now() + 15 * 60_000).toISOString()
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
