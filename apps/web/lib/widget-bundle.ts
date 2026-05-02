import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { NextResponse } from "next/server";

const currentDir = dirname(fileURLToPath(import.meta.url));
const widgetPath = join(currentDir, "..", "..", "..", "packages", "widget", "dist", "widget.global.js");

const javascriptHeaders = {
  "Content-Type": "application/javascript; charset=utf-8"
};

const realBundleCacheControl = "public, max-age=300, stale-while-revalidate=86400";
const fallbackCacheControl = "no-store";

export async function readWidgetBundle(): Promise<string> {
  return readFile(widgetPath, "utf8");
}

export function widgetBundleResponse(widget: string): NextResponse {
  const widgetVersion = createHash("sha256").update(widget).digest("hex").slice(0, 16);

  return new NextResponse(widget, {
    headers: {
      ...javascriptHeaders,
      "Cache-Control": realBundleCacheControl,
      ETag: `"changethis-widget-${widgetVersion}"`,
      "X-ChangeThis-Widget-Version": widgetVersion
    }
  });
}

export function missingWidgetBundleResponse(): NextResponse {
  return new NextResponse(missingWidgetBundleFallback(), {
    headers: {
      ...javascriptHeaders,
      "Cache-Control": fallbackCacheControl,
      "X-ChangeThis-Widget-Fallback": "missing-bundle"
    }
  });
}

export function missingWidgetBundleFallback(): string {
  return `(() => {
  const message = "ChangeThis widget is unavailable because the public bundle was not built. Run npm run widget:build before serving /widget.js.";
  const rootId = "changethis-widget-root";
  const fallbackId = "changethis-widget-fallback";

  if (typeof console !== "undefined" && typeof console.error === "function") {
    console.error("[ChangeThis] " + message);
  }

  if (typeof window !== "undefined") {
    window.ChangeThis = Object.assign(window.ChangeThis || {}, {
      unavailable: true,
      reason: "missing-widget-bundle"
    });
  }

  if (typeof document === "undefined") {
    return;
  }

  const currentScript = document.currentScript;
  const silent = currentScript?.dataset?.fallback === "silent";
  if (silent || document.getElementById(rootId) || document.getElementById(fallbackId)) {
    return;
  }

  const mount = () => {
    if (document.getElementById(rootId) || document.getElementById(fallbackId)) {
      return;
    }

    const badge = document.createElement("div");
    badge.id = fallbackId;
    badge.setAttribute("role", "status");
    badge.setAttribute("aria-live", "polite");
    badge.textContent = "Feedback indisponible";
    badge.title = message;
    badge.style.cssText = "position:fixed;right:20px;bottom:20px;z-index:2147483647;padding:10px 14px;border-radius:999px;background:#111827;color:#fff;font:600 13px/1.2 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;box-shadow:0 10px 24px rgba(17,24,39,.25);";
    document.body.appendChild(badge);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }
})();`;
}
