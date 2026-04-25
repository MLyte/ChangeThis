export type FeedbackType = "comment" | "pin" | "screenshot";

export type FeedbackStatus = "raw" | "sent_to_github" | "failed";

export type PinTarget = {
  x: number;
  y: number;
  selector?: string;
  text?: string;
};

export type FeedbackMetadata = {
  url: string;
  path: string;
  title: string;
  userAgent: string;
  viewport: {
    width: number;
    height: number;
  };
  devicePixelRatio: number;
  language: string;
  createdAt: string;
};

export type FeedbackPayload = {
  projectKey: string;
  type: FeedbackType;
  message: string;
  metadata: FeedbackMetadata;
  pin?: PinTarget;
  screenshotDataUrl?: string;
};

export type GitHubIssueDraft = {
  title: string;
  body: string;
  labels: string[];
};

const labelByType: Record<FeedbackType, string> = {
  comment: "mode:comment",
  pin: "mode:pin",
  screenshot: "mode:screenshot"
};

export function buildGitHubIssueDraft(feedback: FeedbackPayload): GitHubIssueDraft {
  const pageLabel = feedback.metadata.path || "/";
  const titleSummary = summarize(feedback.message, feedback.pin?.text);
  const title = `[Feedback] ${pageLabel} - ${titleSummary}`;
  const labels = ["source:client-feedback", "status:raw", "type:feedback", labelByType[feedback.type]];

  return {
    title,
    labels,
    body: buildIssueBody(feedback)
  };
}

function buildIssueBody(feedback: FeedbackPayload): string {
  const lines = [
    "## Feedback client",
    "",
    feedback.message ? `> ${feedback.message}` : "> Aucun message fourni.",
    "",
    "## Contexte",
    "",
    `- Page: ${feedback.metadata.url}`,
    `- Chemin: ${feedback.metadata.path}`,
    `- Titre: ${feedback.metadata.title || "Non disponible"}`,
    `- Mode: ${feedback.type}`,
    `- Viewport: ${feedback.metadata.viewport.width}x${feedback.metadata.viewport.height}`,
    `- Device pixel ratio: ${feedback.metadata.devicePixelRatio}`,
    `- Langue: ${feedback.metadata.language}`,
    `- Date: ${feedback.metadata.createdAt}`,
    "",
    "## Localisation",
    "",
    feedback.pin
      ? `- Position: x=${feedback.pin.x}, y=${feedback.pin.y}`
      : "- Position: Non applicable",
    feedback.pin?.selector ? `- Élément probable: \`${feedback.pin.selector}\`` : "- Élément probable: Non disponible",
    feedback.pin?.text ? `- Texte visible: ${feedback.pin.text}` : "- Texte visible: Non disponible",
    "",
    "## Données techniques",
    "",
    "```json",
    JSON.stringify(
      {
        projectKey: feedback.projectKey,
        type: feedback.type,
        metadata: feedback.metadata,
        pin: feedback.pin ?? null,
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
      ? "Capture reçue par l'API ChangeThis. Le stockage permanent sera géré par Supabase Storage."
      : "Aucune capture jointe.",
    "",
    "## Analyse IA",
    "",
    "À compléter automatiquement."
  ];

  return lines.join("\n");
}

function summarize(message: string, fallback?: string): string {
  const source = message.trim() || fallback?.trim() || "Retour client";
  const firstLine = source.split(/\r?\n/)[0] ?? "Retour client";
  return firstLine.length > 72 ? `${firstLine.slice(0, 69)}...` : firstLine;
}
