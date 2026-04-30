import { NextResponse } from "next/server";
import { authFailureResponse, isAuthFailure, requireWorkspaceRole, requireWorkspaceSession } from "../../../../../lib/auth";
import {
  deleteConnectedSite,
  installSnippet,
  ProjectTargetValidationError,
  updateProjectWidgetSettings
} from "../../../../../lib/project-registry";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ projectKey: string }> }
) {
  const session = requireWorkspaceRole(await requireWorkspaceSession(request), "admin");

  if (isAuthFailure(session)) {
    return authFailureResponse(session);
  }

  if (!session.workspace) {
    return authFailureResponse({ error: "Workspace access required", status: 403 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  if (!isRecord(body) || !isWidgetLocale(body.widgetLocale) || !isWidgetButtonPosition(body.widgetButtonPosition) || !isWidgetButtonVariant(body.widgetButtonVariant)) {
    return NextResponse.json({ error: "widgetLocale, widgetButtonPosition and widgetButtonVariant are required" }, { status: 422 });
  }

  const { projectKey } = await context.params;

  try {
    const site = await updateProjectWidgetSettings({
      projectKey,
      widgetLocale: body.widgetLocale,
      widgetButtonPosition: body.widgetButtonPosition,
      widgetButtonVariant: body.widgetButtonVariant
    }, session.workspace.id);

    return NextResponse.json({
      site,
      installSnippet: installSnippet(site)
    });
  } catch (error) {
    if (error instanceof ProjectTargetValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    throw error;
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ projectKey: string }> }
) {
  const session = requireWorkspaceRole(await requireWorkspaceSession(request), "admin");

  if (isAuthFailure(session)) {
    return authFailureResponse(session);
  }

  if (!session.workspace) {
    return authFailureResponse({ error: "Workspace access required", status: 403 });
  }

  const { projectKey } = await context.params;
  const deleted = await deleteConnectedSite(projectKey, session.workspace.id);

  if (!deleted) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isWidgetLocale(value: unknown): value is "fr" | "en" {
  return value === "fr" || value === "en";
}

function isWidgetButtonPosition(value: unknown): value is "bottom-right" | "bottom-left" | "top-right" | "top-left" {
  return value === "bottom-right" || value === "bottom-left" || value === "top-right" || value === "top-left";
}

function isWidgetButtonVariant(value: unknown): value is "default" | "subtle" {
  return value === "default" || value === "subtle";
}
