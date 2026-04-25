import { buildGitHubIssueDraft, type FeedbackPayload } from "@changethis/shared";
import { NextResponse } from "next/server";
import { demoProject } from "../../../../lib/demo-project";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const payload = (await request.json()) as FeedbackPayload;

  if (payload.projectKey !== demoProject.publicKey) {
    return NextResponse.json({ error: "Unknown project" }, { status: 404 });
  }

  if (origin && !demoProject.allowedOrigins.includes(origin)) {
    return NextResponse.json({ error: "Origin is not allowed for this project" }, { status: 403 });
  }

  if (!["comment", "pin", "screenshot"].includes(payload.type)) {
    return NextResponse.json({ error: "Invalid feedback type" }, { status: 422 });
  }

  const issueDraft = buildGitHubIssueDraft(payload);

  return NextResponse.json({
    id: crypto.randomUUID(),
    status: "received",
    next: "github_issue_creation",
    issueDraft
  });
}
