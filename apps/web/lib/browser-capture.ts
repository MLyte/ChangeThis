import type { StoredFeedback } from "./feedback-repository";
import { getFeedbackRepository } from "./feedback-repository";
import { logInfo, logWarn } from "./logger";

const browserCaptureTimeoutMs = Number(process.env.BROWSER_CAPTURE_TIMEOUT_MS ?? 12_000);

type PlaywrightModule = {
  chromium: {
    launch: (options: { headless: boolean }) => Promise<Browser>;
  };
};

type Browser = {
  newContext: (options: {
    deviceScaleFactor: number;
    hasTouch: boolean;
    isMobile: boolean;
    viewport: { width: number; height: number };
    userAgent: string;
  }) => Promise<BrowserContext>;
  close: () => Promise<void>;
};

type BrowserContext = {
  newPage: () => Promise<Page>;
  close: () => Promise<void>;
};

type Page = {
  setDefaultTimeout: (timeout: number) => void;
  goto: (url: string, options: { timeout: number; waitUntil: "domcontentloaded" }) => Promise<unknown>;
  waitForLoadState: (state: "networkidle", options: { timeout: number }) => Promise<unknown>;
  evaluate: <T>(fn: (input: T) => void, input: T) => Promise<unknown>;
  screenshot: (options: {
    animations: "disabled";
    fullPage: boolean;
    type: "jpeg";
    quality: number;
    timeout: number;
  }) => Promise<Buffer>;
};

export function scheduleBrowserCaptureForFeedback(feedback: StoredFeedback, requestId: string, allowedOrigin: string): void {
  if (process.env.ENABLE_BROWSER_CAPTURE !== "true") {
    return;
  }

  setTimeout(() => {
    void captureBrowserScreenshotForFeedback(feedback, requestId, allowedOrigin);
  }, 0);
}

export async function captureBrowserScreenshotForFeedback(feedback: StoredFeedback, requestId: string, allowedOrigin: string): Promise<void> {
  try {
    if (!isAllowedCaptureUrl(feedback.payload.metadata.url, allowedOrigin)) {
      logWarn("browser_capture_rejected_url_origin", {
        request_id: requestId,
        feedback_id: feedback.id,
        project_id: feedback.projectKey
      });
      return;
    }

    const dataUrl = await captureBrowserScreenshot(feedback);
    if (!dataUrl) {
      return;
    }

    await getFeedbackRepository().recordBrowserCapture(feedback.id, dataUrl, { workspaceId: feedback.workspaceId });
    logInfo("browser_capture_created", {
      request_id: requestId,
      feedback_id: feedback.id,
      project_id: feedback.projectKey
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown browser capture error";
    logWarn("browser_capture_skipped", {
      request_id: requestId,
      feedback_id: feedback.id,
      project_id: feedback.projectKey,
      error: message
    });
  }
}

function isAllowedCaptureUrl(value: string, allowedOrigin: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && url.origin === allowedOrigin;
  } catch {
    return false;
  }
}

async function captureBrowserScreenshot(feedback: StoredFeedback): Promise<string | undefined> {
  const playwright = await loadPlaywright();
  if (!playwright) {
    return undefined;
  }

  const browser = await playwright.chromium.launch({ headless: true });
  let context: BrowserContext | undefined;

  try {
    const metadata = feedback.payload.metadata;
    context = await browser.newContext({
      deviceScaleFactor: metadata.devicePixelRatio,
      hasTouch: metadata.viewport.width < 700,
      isMobile: metadata.viewport.width < 700,
      viewport: metadata.viewport,
      userAgent: metadata.userAgent
    });
    const page = await context.newPage();
    page.setDefaultTimeout(browserCaptureTimeoutMs);
    await page.goto(metadata.url, { timeout: browserCaptureTimeoutMs, waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 2_000 }).catch(() => undefined);
    await preparePageForScreenshot(page, feedback);
    const buffer = await page.screenshot({
      animations: "disabled",
      fullPage: false,
      type: "jpeg",
      quality: 82,
      timeout: browserCaptureTimeoutMs
    });
    return `data:image/jpeg;base64,${buffer.toString("base64")}`;
  } finally {
    await context?.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
}

async function preparePageForScreenshot(page: Page, feedback: StoredFeedback): Promise<void> {
  const metadata = feedback.payload.metadata;
  const pins = feedback.payload.pins?.length ? feedback.payload.pins : feedback.payload.pin ? [feedback.payload.pin] : [];
  await page.evaluate(
    ({ pins, scrollX, scrollY }) => {
      document.getElementById("changethis-widget-root")?.remove();
      window.scrollTo(scrollX, scrollY);

      if (pins.length === 0) {
        return;
      }

      const overlay = document.createElement("div");
      overlay.setAttribute("data-changethis-browser-capture-overlay", "pins");
      overlay.style.cssText = "position:fixed;inset:0;z-index:2147483646;pointer-events:none;font-family:Inter,ui-sans-serif,system-ui,sans-serif";
      pins.forEach((pin, index) => {
        const marker = document.createElement("div");
        marker.textContent = String(index + 1);
        marker.style.cssText = [
          "position:absolute",
          `left:${Math.round(pin.x - scrollX)}px`,
          `top:${Math.round(pin.y - scrollY)}px`,
          "width:28px",
          "height:28px",
          "transform:translate(-50%,-50%)",
          "border-radius:999px",
          "background:#e11d48",
          "border:3px solid #fff",
          "box-shadow:0 8px 18px rgba(15,23,42,.35)",
          "color:#fff",
          "display:grid",
          "place-items:center",
          "font-size:13px",
          "font-weight:900",
          "line-height:1"
        ].join(";");
        overlay.appendChild(marker);
      });
      document.body.appendChild(overlay);
    },
    {
      pins,
      scrollX: metadata.scroll?.x ?? 0,
      scrollY: metadata.scroll?.y ?? 0
    }
  );
}

async function loadPlaywright(): Promise<PlaywrightModule | undefined> {
  try {
    const dynamicImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<PlaywrightModule>;
    return await dynamicImport("playwright");
  } catch {
    return undefined;
  }
}
