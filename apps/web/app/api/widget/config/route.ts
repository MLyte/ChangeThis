import { NextResponse } from "next/server";
import { methodNotAllowed } from "../../../../lib/api-security";
import { findConfiguredProjectByKey } from "../../../../lib/project-registry";
import { requestOriginFrom } from "../../../../lib/request-origin";
import { isProductionRuntime } from "../../../../lib/runtime";
import type { ChangeThisProject } from "../../../../lib/demo-project";

type WidgetConfigResponse = {
  projectKey: string;
  name: string;
  modes: Array<"comment" | "pin" | "screenshot">;
  title: ChangeThisProject["widgetTitle"];
  locale: ChangeThisProject["widgetLocale"];
  buttonPosition: ChangeThisProject["widgetButtonPosition"];
  buttonVariant: ChangeThisProject["widgetButtonVariant"];
  displayMode: ChangeThisProject["widgetDisplayMode"];
  reporterFields: ChangeThisProject["widgetReporterFields"];
  visible: boolean;
  endpoint: "/api/public/feedback";
};

const unsupportedMethod = methodNotAllowed(["GET", "HEAD"]);

export const POST = unsupportedMethod;
export const PUT = unsupportedMethod;
export const PATCH = unsupportedMethod;
export const DELETE = unsupportedMethod;

function corsHeaders(origin: string | null): HeadersInit {
  if (!origin) {
    return {};
  }

  return {
    "Access-Control-Allow-Origin": origin,
    Vary: "Origin"
  };
}

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

  return NextResponse.json(widgetConfigResponse(project), {
    headers: corsHeaders(origin ?? null)
  });
}

function widgetConfigResponse(project: ChangeThisProject): WidgetConfigResponse {
  return {
    projectKey: project.publicKey,
    name: project.name,
    modes: project.widgetModes,
    title: project.widgetTitle,
    locale: project.widgetLocale,
    buttonPosition: project.widgetButtonPosition,
    buttonVariant: project.widgetButtonVariant,
    displayMode: project.widgetDisplayMode,
    reporterFields: project.widgetReporterFields,
    visible: project.widgetDisplayMode !== "disabled",
    endpoint: "/api/public/feedback"
  };
}
