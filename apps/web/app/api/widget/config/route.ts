import { NextResponse } from "next/server";
import { findConfiguredProjectByKey } from "../../../../lib/project-registry";
import { requestOriginFrom } from "../../../../lib/request-origin";
import { isProductionRuntime } from "../../../../lib/runtime";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectKey = searchParams.get("project");
  const project = projectKey ? await findConfiguredProjectByKey(projectKey) : undefined;
  const origin = requestOriginFrom(request);

  if (!project) {
    return NextResponse.json({ error: "Unknown project" }, { status: 404 });
  }

  if (!origin && isProductionRuntime) {
    return NextResponse.json({ error: "Origin is required" }, { status: 403 });
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
    buttonVariant: project.widgetButtonVariant,
    endpoint: "/api/public/feedback"
  });
}
