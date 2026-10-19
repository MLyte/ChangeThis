import { NextResponse } from "next/server";
import { readWidgetBundle, widgetBundleVersion } from "./widget-bundle";

const javascriptHeaders = {
  "Content-Type": "application/javascript; charset=utf-8",
  "Cache-Control": "no-store"
};

export function widgetLoaderScript(widgetVersion?: string): string {
  return `(() => {
  const currentScript = document.currentScript;
  const projectKey = currentScript?.dataset?.project;

  if (!currentScript || !projectKey) {
    return;
  }

  const widgetUrl = new URL("widget.js", currentScript.src);
  ${widgetVersion ? `widgetUrl.searchParams.set("v", "${widgetVersion}");` : ""}

  const script = document.createElement("script");
  script.src = widgetUrl.toString();
  for (const [key, value] of Object.entries(currentScript.dataset)) {
    script.dataset[key] = value;
  }
  script.async = true;

  (document.body || document.head || document.documentElement).appendChild(script);
})();`;
}

export async function widgetLoaderResponse(): Promise<NextResponse> {
  let widgetVersion = "";
  try {
    widgetVersion = widgetBundleVersion(await readWidgetBundle());
  } catch {
    widgetVersion = "";
  }

  return new NextResponse(widgetLoaderScript(widgetVersion), {
    headers: javascriptHeaders
  });
}
