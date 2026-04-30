import { NextResponse } from "next/server";
import { findConfiguredProjectByKey } from "../../../../lib/project-registry";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectKey = searchParams.get("project");
  const project = projectKey ? await findConfiguredProjectByKey(projectKey) : undefined;
  const origin = request.headers.get("origin");

  if (!project) {
    return NextResponse.json({ error: "Unknown project" }, { status: 404 });
  }

  if (origin && !project.allowedOrigins.includes(origin)) {
    return NextResponse.json({ error: "Origin is not allowed for this project" }, { status: 403 });
  }

  return NextResponse.json({
    projectKey: project.publicKey,
    name: project.name,
    modes: ["comment", "pin", "screenshot"],
    locale: project.widgetLocale,
    buttonPosition: project.widgetButtonPosition,
    endpoint: "/api/public/feedback"
  });
}
