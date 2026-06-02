import { NextResponse } from "next/server";

const javascriptHeaders = {
  "Content-Type": "application/javascript; charset=utf-8",
  "Cache-Control": "no-store"
};

export function widgetLoaderScript(): string {
  return `(() => {
  const currentScript = document.currentScript;
  const projectKey = currentScript?.dataset?.project;

  if (!currentScript || !projectKey) {
    return;
  }

  const widgetUrl = new URL("widget.js", currentScript.src);
  widgetUrl.searchParams.set("v", String(Date.now()));

  const script = document.createElement("script");
  script.src = widgetUrl.toString();
  script.dataset.project = projectKey;
  script.async = true;

  (document.body || document.head || document.documentElement).appendChild(script);
})();`;
}

export function widgetLoaderResponse(): NextResponse {
  return new NextResponse(widgetLoaderScript(), {
    headers: javascriptHeaders
  });
}
