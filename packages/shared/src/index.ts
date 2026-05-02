export type FeedbackType = "comment" | "pin" | "screenshot";

export type FeedbackStatus = "raw" | "issue_creation_pending" | "retrying" | "sent_to_provider" | "failed" | "kept" | "resolved" | "ignored";
export type IssueProvider = "github" | "gitlab";
export type WorkspaceMemberRole = "owner" | "admin" | "member" | "viewer";
export type ProviderIntegrationStatus = "connected" | "needs_setup" | "needs_reconnect";
export type WidgetLocale = "fr" | "en";
export type WidgetButtonPosition = "bottom-right" | "bottom-left" | "top-right" | "top-left";
export type WidgetButtonVariant = "default" | "subtle";

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceMember = {
  id: string;
  workspaceId: string;
  email: string;
  name?: string;
  role: WorkspaceMemberRole;
  createdAt: string;
  updatedAt: string;
};

export type Site = {
  id: string;
  workspaceId: string;
  publicKey: string;
  name: string;
  allowedOrigins: string[];
  widgetLocale: WidgetLocale;
  widgetButtonPosition: WidgetButtonPosition;
  widgetButtonVariant: WidgetButtonVariant;
  createdAt: string;
  updatedAt: string;
};

export type ProviderIntegration = {
  id: string;
  workspaceId: string;
  provider: IssueProvider;
  accountLabel: string;
  status: ProviderIntegrationStatus;
  issueTarget?: IssueTarget;
  connectPath?: string;
  managePath?: string;
  createdAt: string;
  updatedAt: string;
};

export type PinTarget = {
  x: number;
  y: number;
  selector?: string;
  text?: string;
};

export type CaptureArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type FeedbackAppEnvironment = {
  environment?: string;
  release?: string;
  appVersion?: string;
  buildId?: string;
  commitSha?: string;
  branch?: string;
  testRunId?: string;
  scenario?: string;
  customer?: string;
};

export type FeedbackMetadata = {
  url: string;
  origin?: string;
  path: string;
  title: string;
  userAgent: string;
  viewport: {
    width: number;
    height: number;
  };
  scroll?: {
    x: number;
    y: number;
  };
  screen?: {
    width: number;
    height: number;
    availableWidth?: number;
    availableHeight?: number;
    colorDepth?: number;
    pixelDepth?: number;
  };
  devicePixelRatio: number;
  language: string;
  timezone?: string;
  online?: boolean;
  app?: FeedbackAppEnvironment;
  createdAt: string;
};

export type FeedbackPayload = {
  projectKey: string;
  type: FeedbackType;
  message: string;
  metadata: FeedbackMetadata;
  pin?: PinTarget;
  pins?: PinTarget[];
  captureArea?: CaptureArea;
  screenshotDataUrl?: string;
};

export type IssueTarget = {
  provider: IssueProvider;
  namespace: string;
  project: string;
  externalProjectId?: string;
  installationId?: string;
  integrationId?: string;
  webUrl?: string;
};

export type IssueTargetValidationResult =
  | { ok: true; value: IssueTarget }
  | { ok: false; error: string };

export type ExternalIssueRef = {
  provider: IssueProvider;
  id?: string;
  iid?: number;
  number?: number;
  url: string;
  state?: "open" | "closed";
};

export type IssueDraft = {
  title: string;
  description: string;
  labels: string[];
};

export type GitHubIssueDraft = IssueDraft;

export type FeedbackValidationOptions = {
  maxMessageLength?: number;
  maxScreenshotBytes?: number;
};

export type FeedbackValidationResult =
  | { ok: true; value: FeedbackPayload }
  | { ok: false; error: string };

type MetadataValidationResult =
  | { ok: true; value: FeedbackMetadata }
  | { ok: false; error: string };

type PinValidationResult =
  | { ok: true; value?: PinTarget }
  | { ok: false; error: string };

type PinsValidationResult =
  | { ok: true; value?: PinTarget[] }
  | { ok: false; error: string };

type CaptureAreaValidationResult =
  | { ok: true; value?: CaptureArea }
  | { ok: false; error: string };

const feedbackTypes = ["comment", "pin", "screenshot"] as const;
const issueProviders = ["github", "gitlab"] as const;
const defaultMaxMessageLength = 5000;
const defaultMaxScreenshotBytes = 2_000_000;
const maxPins = 20;
const allowedScreenshotMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const labelByType: Record<FeedbackType, string> = {
  comment: "mode:comment",
  pin: "mode:pin",
  screenshot: "mode:screenshot"
};

export function validateFeedbackPayload(
  value: unknown,
  options: FeedbackValidationOptions = {}
): FeedbackValidationResult {
  const maxMessageLength = options.maxMessageLength ?? defaultMaxMessageLength;
  const maxScreenshotBytes = options.maxScreenshotBytes ?? defaultMaxScreenshotBytes;

  if (!isRecord(value)) {
    return invalid("Payload must be a JSON object");
  }

  if (!isNonEmptyString(value.projectKey, 256)) {
    return invalid("projectKey is required");
  }

  if (!isFeedbackType(value.type)) {
    return invalid("type must be comment, pin, or screenshot");
  }

  if (typeof value.message !== "string" || value.message.length > maxMessageLength) {
    return invalid(`message must be a string up to ${maxMessageLength} characters`);
  }

  const metadata = validateMetadata(value.metadata);
  if (!metadata.ok) {
    return metadata;
  }

  const pin = validatePin(value.pin);
  if (!pin.ok) {
    return pin;
  }

  const pins = validatePins(value.pins);
  if (!pins.ok) {
    return pins;
  }
  const normalizedPins = pins.value ?? (pin.value ? [pin.value] : undefined);
  const normalizedPin = pin.value ?? normalizedPins?.[0];

  const captureArea = validateCaptureArea(value.captureArea);
  if (!captureArea.ok) {
    return captureArea;
  }

  const screenshotDataUrl = value.screenshotDataUrl;
  const normalizedScreenshotDataUrl = typeof screenshotDataUrl === "string" ? screenshotDataUrl : undefined;
  if (screenshotDataUrl !== undefined) {
    const screenshot = validateScreenshotDataUrl(screenshotDataUrl);
    if (!screenshot.ok) {
      return screenshot;
    }

    if (screenshot.bytes > maxScreenshotBytes) {
      return invalid(`screenshotDataUrl must be less than ${maxScreenshotBytes} bytes`);
    }
  }

  return {
    ok: true,
    value: {
      projectKey: value.projectKey,
      type: value.type,
      message: value.message,
      metadata: metadata.value,
      pin: normalizedPin,
      pins: normalizedPins,
      captureArea: captureArea.value,
      screenshotDataUrl: normalizedScreenshotDataUrl
    }
  };
}

export function buildIssueDraft(feedback: FeedbackPayload): IssueDraft {
  const pageLabel = feedback.metadata.path || "/";
  const titleSummary = summarize(feedback.message, feedback.pin?.text);
  const title = `[Feedback] ${pageLabel} - ${titleSummary}`;
  const labels = ["source:client-feedback", "status:raw", "type:feedback", labelByType[feedback.type]];

  return {
    title,
    labels,
    description: buildIssueDescription(feedback)
  };
}

export function buildGitHubIssueDraft(feedback: FeedbackPayload): GitHubIssueDraft {
  return buildIssueDraft(feedback);
}

export function validateIssueTarget(value: unknown): IssueTargetValidationResult {
  if (!isRecord(value)) {
    return invalid("issueTarget must be a JSON object");
  }

  if (!isIssueProvider(value.provider)) {
    return invalid("issueTarget.provider must be github or gitlab");
  }

  if (!isNonEmptyString(value.namespace, 255)) {
    return invalid("issueTarget.namespace is required");
  }

  if (!isNonEmptyString(value.project, 255)) {
    return invalid("issueTarget.project is required");
  }

  if (value.provider === "github" && (value.namespace.includes("/") || value.project.includes("/"))) {
    return invalid("GitHub issue targets must use a single owner and repository name");
  }

  if (value.externalProjectId !== undefined && !isNonEmptyString(value.externalProjectId, 255)) {
    return invalid("issueTarget.externalProjectId must be a non-empty string");
  }

  if (value.installationId !== undefined && !isNonEmptyString(value.installationId, 255)) {
    return invalid("issueTarget.installationId must be a non-empty string");
  }

  if (value.integrationId !== undefined && !isNonEmptyString(value.integrationId, 255)) {
    return invalid("issueTarget.integrationId must be a non-empty string");
  }

  if (value.webUrl !== undefined && (typeof value.webUrl !== "string" || !isHttpUrl(value.webUrl))) {
    return invalid("issueTarget.webUrl must be an HTTP URL");
  }

  return {
    ok: true,
    value: {
      provider: value.provider,
      namespace: value.namespace,
      project: value.project,
      externalProjectId: value.externalProjectId,
      installationId: value.installationId,
      integrationId: value.integrationId,
      webUrl: value.webUrl
    }
  };
}

function buildIssueDescription(feedback: FeedbackPayload): string {
  const pins = getFeedbackPins(feedback);
  const appEnvironmentLines = formatAppEnvironmentForIssue(feedback.metadata.app);
  const lines = [
    "## Feedback client",
    "",
    feedback.message ? `> ${feedback.message}` : "> Aucun message fourni.",
    "",
    "## Contexte",
    "",
    `- Page: ${feedback.metadata.url}`,
    feedback.metadata.origin ? `- Origine: ${feedback.metadata.origin}` : undefined,
    `- Chemin: ${feedback.metadata.path}`,
    `- Titre: ${feedback.metadata.title || "Non disponible"}`,
    `- Mode: ${feedback.type}`,
    `- Viewport: ${feedback.metadata.viewport.width}x${feedback.metadata.viewport.height}`,
    feedback.metadata.screen ? `- Ecran: ${feedback.metadata.screen.width}x${feedback.metadata.screen.height}` : undefined,
    `- Device pixel ratio: ${feedback.metadata.devicePixelRatio}`,
    `- Langue: ${feedback.metadata.language}`,
    feedback.metadata.timezone ? `- Fuseau horaire: ${feedback.metadata.timezone}` : undefined,
    typeof feedback.metadata.online === "boolean" ? `- En ligne: ${feedback.metadata.online ? "oui" : "non"}` : undefined,
    `- Date: ${feedback.metadata.createdAt}`,
    "",
    ...appEnvironmentLines,
    ...(appEnvironmentLines.length ? [""] : []),
    "## Localisation",
    "",
    ...formatPinsForIssue(pins),
    "",
    "## Donnees techniques",
    "",
    "```json",
    JSON.stringify(
      {
        projectKey: feedback.projectKey,
        type: feedback.type,
        metadata: feedback.metadata,
        pin: feedback.pin ?? null,
        pins,
        captureArea: feedback.captureArea ?? null,
        hasScreenshot: Boolean(feedback.screenshotDataUrl)
      },
      null,
      2
    ),
    "```",
    "",
    "## Capture",
    "",
    feedback.screenshotDataUrl
      ? "Capture recue par l'API ChangeThis. Le stockage permanent sera gere par Supabase Storage."
      : "Aucune capture jointe.",
    "",
    "## Analyse IA",
    "",
    "A completer automatiquement."
  ].filter((line): line is string => typeof line === "string");

  return lines.join("\n");
}

function summarize(message: string, fallback?: string): string {
  const source = message.trim() || fallback?.trim() || "Retour client";
  const firstLine = source.split(/\r?\n/)[0] ?? "Retour client";
  return firstLine.length > 72 ? `${firstLine.slice(0, 69)}...` : firstLine;
}

function getFeedbackPins(feedback: FeedbackPayload): PinTarget[] {
  if (feedback.pins?.length) {
    return feedback.pins;
  }

  return feedback.pin ? [feedback.pin] : [];
}

function formatPinsForIssue(pins: PinTarget[]): string[] {
  if (pins.length === 0) {
    return [
      "- Position: Non applicable",
      "- Element probable: Non disponible",
      "- Texte visible: Non disponible"
    ];
  }

  return pins.flatMap((pin, index) => [
    `- Pin #${index + 1}: x=${pin.x}, y=${pin.y}`,
    pin.selector ? `  - Element probable: \`${pin.selector}\`` : "  - Element probable: Non disponible",
    pin.text ? `  - Texte visible: ${pin.text}` : "  - Texte visible: Non disponible"
  ]);
}

function validateMetadata(value: unknown): MetadataValidationResult {
  if (!isRecord(value)) {
    return invalid("metadata is required");
  }

  if (!isNonEmptyString(value.url, 2048) || !isHttpUrl(value.url)) {
    return invalid("metadata.url must be an HTTP URL");
  }

  if (typeof value.path !== "string" || value.path.length > 1024 || !value.path.startsWith("/")) {
    return invalid("metadata.path must be an absolute path");
  }

  if (typeof value.title !== "string" || value.title.length > 512) {
    return invalid("metadata.title must be a string");
  }

  if (!isNonEmptyString(value.userAgent, 1024)) {
    return invalid("metadata.userAgent is required");
  }

  if (!isRecord(value.viewport) || !isPositiveInteger(value.viewport.width, 10_000) || !isPositiveInteger(value.viewport.height, 10_000)) {
    return invalid("metadata.viewport must contain positive width and height");
  }

  if (typeof value.devicePixelRatio !== "number" || !Number.isFinite(value.devicePixelRatio) || value.devicePixelRatio <= 0 || value.devicePixelRatio > 10) {
    return invalid("metadata.devicePixelRatio must be a positive number");
  }

  if (!isNonEmptyString(value.language, 64)) {
    return invalid("metadata.language is required");
  }

  if (!isNonEmptyString(value.createdAt, 64) || Number.isNaN(Date.parse(value.createdAt))) {
    return invalid("metadata.createdAt must be an ISO date string");
  }

  const metadata: FeedbackMetadata = {
    url: value.url,
    origin: validateOrigin(value.origin),
    path: value.path,
    title: value.title,
    userAgent: value.userAgent,
    viewport: {
      width: value.viewport.width,
      height: value.viewport.height
    },
    devicePixelRatio: value.devicePixelRatio,
    language: value.language,
    createdAt: value.createdAt
  };

  if (value.origin !== undefined && metadata.origin === undefined) {
    return invalid("metadata.origin must be an HTTP origin");
  }

  if (value.scroll !== undefined) {
    if (!isRecord(value.scroll) || !isNonNegativeNumber(value.scroll.x, 100_000) || !isNonNegativeNumber(value.scroll.y, 100_000)) {
      return invalid("metadata.scroll must contain non-negative x and y");
    }

    metadata.scroll = {
      x: value.scroll.x,
      y: value.scroll.y
    };
  }

  if (value.screen !== undefined) {
    const screen = value.screen;
    if (!isRecord(screen)
      || !isPositiveInteger(screen.width, 100_000)
      || !isPositiveInteger(screen.height, 100_000)) {
      return invalid("metadata.screen must contain positive width and height");
    }

    const availableWidth = screen.availableWidth;
    const availableHeight = screen.availableHeight;
    const colorDepth = screen.colorDepth;
    const pixelDepth = screen.pixelDepth;

    if (availableWidth !== undefined && !isPositiveInteger(availableWidth, 100_000)) {
      return invalid("metadata.screen.availableWidth must be a positive integer");
    }

    if (availableHeight !== undefined && !isPositiveInteger(availableHeight, 100_000)) {
      return invalid("metadata.screen.availableHeight must be a positive integer");
    }

    if (colorDepth !== undefined && !isPositiveInteger(colorDepth, 256)) {
      return invalid("metadata.screen.colorDepth must be a positive integer");
    }

    if (pixelDepth !== undefined && !isPositiveInteger(pixelDepth, 256)) {
      return invalid("metadata.screen.pixelDepth must be a positive integer");
    }

    metadata.screen = {
      width: screen.width,
      height: screen.height,
      availableWidth,
      availableHeight,
      colorDepth,
      pixelDepth
    };
  }

  if (value.timezone !== undefined) {
    if (typeof value.timezone !== "string" || value.timezone.length > 128) {
      return invalid("metadata.timezone must be a string");
    }

    metadata.timezone = value.timezone;
  }

  if (value.online !== undefined) {
    if (typeof value.online !== "boolean") {
      return invalid("metadata.online must be a boolean");
    }

    metadata.online = value.online;
  }

  if (value.app !== undefined) {
    const app = validateAppEnvironment(value.app);
    if (!app.ok) {
      return app;
    }

    metadata.app = app.value;
  }

  return {
    ok: true,
    value: metadata
  };
}

function validateAppEnvironment(value: unknown): { ok: true; value: FeedbackAppEnvironment } | { ok: false; error: string } {
  if (!isRecord(value)) {
    return invalid("metadata.app must be an object");
  }

  const app: FeedbackAppEnvironment = {};
  for (const key of ["environment", "release", "appVersion", "buildId", "commitSha", "branch", "testRunId", "scenario", "customer"] as const) {
    const item = value[key];
    if (item === undefined) {
      continue;
    }

    if (typeof item !== "string" || item.length > 128) {
      return invalid(`metadata.app.${key} must be a string`);
    }

    app[key] = item;
  }

  return { ok: true, value: app };
}

function validateOrigin(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || value.length > 2048) {
    return undefined;
  }

  try {
    const url = new URL(value);
    if ((url.protocol === "http:" || url.protocol === "https:") && url.origin === value) {
      return value;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function formatAppEnvironmentForIssue(app: FeedbackAppEnvironment | undefined): string[] {
  if (!app) {
    return [];
  }

  const lines = [
    app.environment ? `- Environnement: ${app.environment}` : undefined,
    app.release ? `- Release: ${app.release}` : undefined,
    app.appVersion ? `- Version app: ${app.appVersion}` : undefined,
    app.buildId ? `- Build: ${app.buildId}` : undefined,
    app.commitSha ? `- Commit: ${app.commitSha}` : undefined,
    app.branch ? `- Branche: ${app.branch}` : undefined,
    app.testRunId ? `- Test run: ${app.testRunId}` : undefined,
    app.scenario ? `- Scenario: ${app.scenario}` : undefined,
    app.customer ? `- Client: ${app.customer}` : undefined
  ].filter((line): line is string => typeof line === "string");

  return lines.length ? ["## Environnement client/test", "", ...lines] : [];
}

function validatePin(value: unknown): PinValidationResult {
  if (value === undefined) {
    return { ok: true };
  }

  if (!isRecord(value)) {
    return invalid("pin must be an object");
  }

  if (!isNonNegativeNumber(value.x, 100_000) || !isNonNegativeNumber(value.y, 100_000)) {
    return invalid("pin coordinates must be non-negative numbers");
  }

  if (value.selector !== undefined && (typeof value.selector !== "string" || value.selector.length > 512)) {
    return invalid("pin.selector must be a string");
  }

  if (value.text !== undefined && (typeof value.text !== "string" || value.text.length > 500)) {
    return invalid("pin.text must be a string");
  }

  return {
    ok: true,
    value: {
      x: value.x,
      y: value.y,
      selector: value.selector,
      text: value.text
    }
  };
}

function validatePins(value: unknown): PinsValidationResult {
  if (value === undefined) {
    return { ok: true };
  }

  if (!Array.isArray(value)) {
    return invalid("pins must be an array");
  }

  if (value.length > maxPins) {
    return invalid(`pins must contain at most ${maxPins} items`);
  }

  const pins: PinTarget[] = [];
  for (const item of value) {
    const pin = validatePin(item);
    if (!pin.ok) {
      return pin;
    }

    if (pin.value) {
      pins.push(pin.value);
    }
  }

  return {
    ok: true,
    value: pins.length ? pins : undefined
  };
}

function validateCaptureArea(value: unknown): CaptureAreaValidationResult {
  if (value === undefined) {
    return { ok: true };
  }

  if (!isRecord(value)) {
    return invalid("captureArea must be an object");
  }

  if (
    !isNonNegativeNumber(value.x, 10_000)
    || !isNonNegativeNumber(value.y, 10_000)
    || !isPositiveInteger(value.width, 10_000)
    || !isPositiveInteger(value.height, 10_000)
  ) {
    return invalid("captureArea must contain x, y, width, and height");
  }

  return {
    ok: true,
    value: {
      x: value.x,
      y: value.y,
      width: value.width,
      height: value.height
    }
  };
}

function validateScreenshotDataUrl(value: unknown): { ok: true; bytes: number } | { ok: false; error: string } {
  if (typeof value !== "string") {
    return invalid("screenshotDataUrl must be an image data URL");
  }

  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) {
    return invalid("screenshotDataUrl must be a base64 image data URL");
  }

  const mimeType = match[1].toLowerCase();
  if (!allowedScreenshotMimeTypes.has(mimeType)) {
    return invalid("screenshotDataUrl must be a PNG, JPEG, or WebP image");
  }

  const base64 = match[2];
  if (base64.length === 0 || base64.length % 4 === 1) {
    return invalid("screenshotDataUrl must contain valid base64 image data");
  }

  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return {
    ok: true,
    bytes: Math.ceil(base64.length * 0.75) - padding
  };
}

function invalid(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFeedbackType(value: unknown): value is FeedbackType {
  return typeof value === "string" && feedbackTypes.includes(value as FeedbackType);
}

function isIssueProvider(value: unknown): value is IssueProvider {
  return typeof value === "string" && issueProviders.includes(value as IssueProvider);
}

function isNonEmptyString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isPositiveInteger(value: unknown, max: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= max;
}

function isNonNegativeNumber(value: unknown, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= max;
}

function estimateDataUrlBytes(value: string): number {
  const commaIndex = value.indexOf(",");
  if (commaIndex === -1) {
    return value.length;
  }

  return Math.ceil((value.length - commaIndex - 1) * 0.75);
}
