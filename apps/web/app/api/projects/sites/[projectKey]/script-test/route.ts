import { NextResponse } from "next/server";
import { authFailureResponse, isAuthFailure, requireWorkspaceSession } from "../../../../../../lib/auth";
import { findConfiguredProjectByKey, installSnippet } from "../../../../../../lib/project-registry";

const scriptFetchTimeoutMs = 8000;

export async function POST(
  request: Request,
  context: { params: Promise<{ projectKey: string }> }
) {
  const session = await requireWorkspaceSession(request);

  if (isAuthFailure(session)) {
    return authFailureResponse(session);
  }

  if (!session.workspace) {
    return authFailureResponse({ error: "Workspace access required", status: 403 });
  }

  const { projectKey } = await context.params;
  const project = await findConfiguredProjectByKey(projectKey, session.workspace.id);

  if (!project) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const configUrl = new URL("/api/widget/config", url.origin);
  configUrl.searchParams.set("project", project.publicKey);
  const configResponse = await fetch(configUrl);
  const pageUrl = project.allowedOrigins[0];

  if (!configResponse.ok) {
    return NextResponse.json({
      ok: false,
      status: "config_error",
      message: "Configuration widget indisponible pour cette clé publique.",
      installSnippet: installSnippet(project),
      checkedUrl: pageUrl
    }, { status: 409 });
  }

  if (!pageUrl) {
    return NextResponse.json({
      ok: false,
      status: "missing_site_url",
      message: "Aucune URL de site n'est configurée pour tester l'installation du script.",
      installSnippet: installSnippet(project)
    }, { status: 409 });
  }

  const pageCheck = await fetchSitePage(pageUrl);

  if (!pageCheck.ok) {
    return NextResponse.json({
      ok: false,
      status: pageCheck.status,
      message: pageCheck.message,
      installSnippet: installSnippet(project),
      checkedUrl: pageUrl
    }, { status: 409 });
  }

  const scriptCheck = detectWidgetScript(pageCheck.html, project.publicKey);

  return NextResponse.json({
    ok: scriptCheck.ok,
    status: scriptCheck.status,
    message: scriptCheck.message,
    installSnippet: installSnippet(project),
    checkedUrl: pageUrl
  }, { status: scriptCheck.ok ? 200 : 409 });
}

async function fetchSitePage(url: string): Promise<
  | { ok: true; html: string }
  | { ok: false; status: string; message: string }
> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), scriptFetchTimeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      return {
        ok: false,
        status: "page_unreachable",
        message: `Page inaccessible (${response.status}). Le script n'a pas pu être vérifié sur ${url}.`
      };
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType && !contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      return {
        ok: false,
        status: "page_not_html",
        message: "L'URL configurée ne renvoie pas une page HTML vérifiable."
      };
    }

    return {
      ok: true,
      html: await response.text()
    };
  } catch (error) {
    return {
      ok: false,
      status: "page_unreachable",
      message: error instanceof Error && error.name === "AbortError"
        ? "La page ne répond pas assez vite pour vérifier l'installation du script."
        : "La page est inaccessible. Le script n'a pas pu être vérifié sur le site."
    };
  } finally {
    clearTimeout(timeout);
  }
}

function detectWidgetScript(html: string, projectKey: string): { ok: boolean; status: string; message: string } {
  const scriptTags = html.match(/<script\b[^>]*>/gi) ?? [];
  const widgetScripts = scriptTags.filter((scriptTag) => {
    const src = getHtmlAttribute(scriptTag, "src") ?? "";
    return src.includes("/widget.js") || src.endsWith("widget.js");
  });

  if (widgetScripts.length === 0) {
    const hasLegacyScript = /changethis-(widget|init)\.js/i.test(html);

    return {
      ok: false,
      status: "script_missing",
      message: hasLegacyScript
        ? "Ancien script ChangeThis détecté, mais le snippet widget actuel est introuvable sur l'URL du site."
        : "Script widget introuvable sur l'URL du site. Ajoutez le snippet avant de tester l'installation."
    };
  }

  const hasMatchingProjectKey = widgetScripts.some((scriptTag) => getHtmlAttribute(scriptTag, "data-project") === projectKey);

  if (!hasMatchingProjectKey) {
    return {
      ok: false,
      status: "project_key_mismatch",
      message: "Script widget détecté, mais la clé publique ne correspond pas à ce site."
    };
  }

  return {
    ok: true,
    status: "script_detected",
    message: "Script widget détecté sur l'URL du site. Les retours peuvent être envoyés."
  };
}

function getHtmlAttribute(tag: string, name: string): string | undefined {
  const match = tag.match(new RegExp(`\\s${name}=(["'])(.*?)\\1`, "i"));
  return match?.[2];
}
