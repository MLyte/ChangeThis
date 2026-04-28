import html2canvas from "html2canvas";
import type { CaptureArea, FeedbackPayload, FeedbackType, PinTarget } from "@changethis/shared";

const capturePage = html2canvas as unknown as typeof import("html2canvas").default;

type WidgetOptions = {
  projectKey: string;
  endpoint?: string;
  buttonLabel?: string;
  buttonStateLabel?: string;
  buttonVariant?: "default" | "dev" | "prod" | "review";
  locale?: "fr" | "en";
  visible?: boolean;
};

const rootId = "changethis-widget-root";
const languageStorageKey = "changethis:preferredLanguage";
const widgetCopy = {
  fr: {
    button: "Feedback",
    title: "Que faut-il changer ?",
    note: "Note",
    pin: "Pin",
    screenshot: "Capture",
    placeholder: "Décris le retour client ici",
    metaDefault: "URL, navigateur et viewport seront ajoutés automatiquement.",
    close: "Fermer",
    sending: "Envoi...",
    send: "Envoyer",
    selectArea: "Trace la zone a capturer",
    sent: "Feedback envoye. Merci.",
    alertError: "Impossible d'envoyer le feedback. Réessaie dans un instant."
  },
  en: {
    button: "Feedback",
    title: "What should change?",
    note: "Note",
    pin: "Pin",
    screenshot: "Screenshot",
    placeholder: "Describe the client feedback here",
    metaDefault: "URL, browser and viewport will be added automatically.",
    close: "Close",
    sending: "Sending...",
    send: "Send",
    selectArea: "Drag the area to capture",
    sent: "Feedback sent. Thank you.",
    alertError: "Unable to send feedback. Try again in a moment."
  }
};

export function initChangeThis(options: WidgetOptions): void {
  if (!options.projectKey || options.visible === false || document.getElementById(rootId)) {
    return;
  }

  const endpoint = options.endpoint ?? inferEndpoint();
  const copy = widgetCopy[options.locale ?? inferLocale()];
  const buttonLabel = options.buttonLabel ?? copy.button;
  const buttonStateLabel = options.buttonStateLabel;
  const buttonVariant = options.buttonVariant ?? "default";
  const root = document.createElement("div");
  root.id = rootId;
  root.attachShadow({ mode: "open" });
  document.documentElement.appendChild(root);

  const state = {
    open: false,
    type: "comment" as FeedbackType,
    pin: undefined as PinTarget | undefined,
    captureArea: undefined as CaptureArea | undefined,
    sending: false,
    message: "",
    notice: ""
  };

  const updatePinnedMarker = () => {
    const marker = root.shadowRoot?.querySelector<HTMLElement>(".pin");
    if (!marker || !state.pin) return;

    const position = pinViewportPosition(state.pin);
    marker.style.left = `${position.x}px`;
    marker.style.top = `${position.y}px`;
  };

  const render = () => {
    const shadow = root.shadowRoot;
    if (!shadow) return;

    const pinPosition = state.pin ? pinViewportPosition(state.pin) : undefined;

    shadow.innerHTML = `
      <style>
        :host { all: initial; }
        * { box-sizing: border-box; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        .button {
          position: fixed;
          right: 20px;
          bottom: 20px;
          z-index: 2147483647;
          border: 0;
          border-radius: 999px;
          background: #111827;
          color: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 700;
          padding: 12px 16px;
          box-shadow: 0 12px 30px rgba(17, 24, 39, 0.22);
        }
        .button[data-variant="dev"] { background: #1d4ed8; }
        .button[data-variant="prod"] { background: #0f766e; }
        .button[data-variant="review"] { background: #7c2d12; }
        .button-state {
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.16);
          font-size: 11px;
          font-weight: 800;
          line-height: 1;
          padding: 5px 7px;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .panel {
          position: fixed;
          right: 20px;
          bottom: 76px;
          z-index: 2147483647;
          width: min(340px, calc(100vw - 32px));
          border: 1px solid #d1d5db;
          border-radius: 8px;
          background: #fff;
          color: #111827;
          box-shadow: 0 20px 50px rgba(17, 24, 39, 0.18);
          padding: 14px;
        }
        .title { font-size: 14px; font-weight: 800; margin: 0 0 10px; }
        .modes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 10px; }
        .mode, .send, .cancel {
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: #f9fafb;
          color: #111827;
          cursor: pointer;
          font-size: 12px;
          font-weight: 700;
          min-height: 34px;
          padding: 8px;
        }
        .mode[data-active="true"] { border-color: #111827; background: #111827; color: #fff; }
        textarea {
          width: 100%;
          min-height: 92px;
          resize: vertical;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          color: #111827;
          font-size: 14px;
          line-height: 1.4;
          padding: 10px;
        }
        .meta {
          color: #6b7280;
          font-size: 12px;
          line-height: 1.4;
          margin: 8px 0 0;
        }
        .actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 10px; }
        .send { background: #0f766e; border-color: #0f766e; color: #fff; }
        .send:disabled { cursor: wait; opacity: .65; }
        .pin {
          position: fixed;
          z-index: 2147483646;
          width: 24px;
          height: 24px;
          transform: translate(-50%, -50%);
          border: 2px solid #fff;
          border-radius: 999px;
          background: #e11d48;
          color: #fff;
          display: grid;
          place-items: center;
          font-size: 12px;
          font-weight: 800;
          box-shadow: 0 8px 22px rgba(225, 29, 72, 0.35);
        }
        .notice {
          position: fixed;
          right: 20px;
          bottom: 76px;
          z-index: 2147483647;
          border: 1px solid #bbf7d0;
          border-radius: 8px;
          background: #f0fdf4;
          color: #166534;
          font-size: 13px;
          font-weight: 800;
          padding: 12px 14px;
          box-shadow: 0 14px 34px rgba(22, 101, 52, 0.16);
        }
      </style>
      ${state.pin && pinPosition ? `<div class="pin" style="left:${pinPosition.x}px;top:${pinPosition.y}px">1</div>` : ""}
      ${state.notice ? `<div class="notice" role="status">${escapeHtml(state.notice)}</div>` : ""}
      <button class="button" data-action="toggle" data-variant="${buttonVariant}">
        <span>${escapeHtml(buttonLabel)}</span>
        ${buttonStateLabel ? `<span class="button-state">${escapeHtml(buttonStateLabel)}</span>` : ""}
      </button>
      ${state.open ? `
        <section class="panel" aria-label="Envoyer un feedback">
          <p class="title">${escapeHtml(copy.title)}</p>
          <div class="modes">
            <button class="mode" data-mode="comment" data-active="${state.type === "comment"}">${escapeHtml(copy.note)}</button>
            <button class="mode" data-mode="pin" data-active="${state.type === "pin"}">${escapeHtml(copy.pin)}</button>
            <button class="mode" data-mode="screenshot" data-active="${state.type === "screenshot"}">${escapeHtml(copy.screenshot)}</button>
          </div>
          <textarea placeholder="${escapeHtml(copy.placeholder)}">${escapeHtml(state.message)}</textarea>
          <p class="meta">${feedbackMeta(state, copy.metaDefault)}</p>
          <div class="actions">
            <button class="cancel" data-action="close">${escapeHtml(copy.close)}</button>
            <button class="send" data-action="send" ${state.sending ? "disabled" : ""}>${state.sending ? escapeHtml(copy.sending) : escapeHtml(copy.send)}</button>
          </div>
        </section>
      ` : ""}
    `;

    shadow.querySelector<HTMLButtonElement>("[data-action='toggle']")?.addEventListener("click", () => {
      state.open = !state.open;
      render();
    });

    shadow.querySelector<HTMLButtonElement>("[data-action='close']")?.addEventListener("click", () => {
      state.open = false;
      render();
    });

    shadow.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        state.type = button.dataset.mode as FeedbackType;
        state.notice = "";
        if (state.type === "pin") {
          state.captureArea = undefined;
          startPinMode((pin) => {
            state.pin = pin;
            state.open = true;
            render();
          });
          state.open = false;
        } else if (state.type === "screenshot") {
          state.pin = undefined;
          state.open = false;
          render();
          startCaptureSelection(copy.selectArea, (area) => {
            state.captureArea = area;
            state.open = true;
            render();
          });
          return;
        } else {
          state.pin = undefined;
          state.captureArea = undefined;
        }
        render();
      });
    });

    shadow.querySelector<HTMLTextAreaElement>("textarea")?.addEventListener("input", (event) => {
      state.message = (event.target as HTMLTextAreaElement).value;
    });

    shadow.querySelector<HTMLButtonElement>("[data-action='send']")?.addEventListener("click", async () => {
      state.sending = true;
      render();
      try {
        await submitFeedback({
          endpoint,
          projectKey: options.projectKey,
          type: state.type,
          message: state.message,
          pin: state.pin,
          captureArea: state.captureArea
        });
        state.message = "";
        state.pin = undefined;
        state.captureArea = undefined;
        state.type = "comment";
        state.open = false;
        state.notice = copy.sent;
        window.setTimeout(() => {
          state.notice = "";
          render();
        }, 3600);
      } catch (error) {
        console.error("[ChangeThis] Failed to send feedback", error);
        window.alert(copy.alertError);
      } finally {
        state.sending = false;
        render();
      }
    });
  };

  window.addEventListener("scroll", updatePinnedMarker, { passive: true });
  window.addEventListener("resize", updatePinnedMarker);

  render();
}

async function submitFeedback(params: {
  endpoint: string;
  projectKey: string;
  type: FeedbackType;
  message: string;
  pin?: PinTarget;
  captureArea?: CaptureArea;
}) {
  const screenshotDataUrl = params.type === "screenshot" && params.captureArea
    ? await captureViewport(params.captureArea)
    : params.type === "pin"
      ? await captureViewport()
      : undefined;

  const payload: FeedbackPayload = {
    projectKey: params.projectKey,
    type: params.type,
    message: params.message,
    pin: params.pin,
    captureArea: params.captureArea,
    screenshotDataUrl,
    metadata: {
      url: window.location.href,
      path: window.location.pathname,
      title: document.title,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      scroll: {
        x: window.scrollX,
        y: window.scrollY
      },
      devicePixelRatio: window.devicePixelRatio,
      language: navigator.language,
      createdAt: new Date().toISOString()
    }
  };

  const response = await fetch(params.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Feedback API returned ${response.status}`);
  }
}

function startCaptureSelection(label: string, onSelect: (area: CaptureArea) => void): void {
  const layer = document.createElement("div");
  layer.innerHTML = `
    <style>
      .changethis-selection-layer {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        cursor: crosshair;
        background: rgba(17, 24, 39, 0.18);
      }
      .changethis-selection-help {
        position: fixed;
        left: 50%;
        top: 18px;
        transform: translateX(-50%);
        border-radius: 999px;
        background: #111827;
        color: #fff;
        font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        font-size: 13px;
        font-weight: 800;
        padding: 10px 14px;
      }
      .changethis-selection-box {
        position: fixed;
        border: 2px solid #fff;
        background: rgba(15, 118, 110, 0.22);
        box-shadow: 0 0 0 9999px rgba(17, 24, 39, 0.36);
      }
    </style>
    <div class="changethis-selection-layer">
      <div class="changethis-selection-help">${escapeHtml(label)}</div>
      <div class="changethis-selection-box" hidden></div>
    </div>
  `;
  document.documentElement.appendChild(layer);

  const surface = layer.querySelector<HTMLElement>(".changethis-selection-layer");
  const box = layer.querySelector<HTMLElement>(".changethis-selection-box");
  let startX = 0;
  let startY = 0;
  let latestX = 0;
  let latestY = 0;
  let dragging = false;

  const updateBox = () => {
    if (!box) return;
    const left = Math.min(startX, latestX);
    const top = Math.min(startY, latestY);
    const width = Math.abs(latestX - startX);
    const height = Math.abs(latestY - startY);
    box.hidden = width < 4 || height < 4;
    box.style.left = `${left}px`;
    box.style.top = `${top}px`;
    box.style.width = `${width}px`;
    box.style.height = `${height}px`;
  };

  surface?.addEventListener("pointerdown", (event) => {
    dragging = true;
    startX = event.clientX;
    startY = event.clientY;
    latestX = event.clientX;
    latestY = event.clientY;
    surface.setPointerCapture(event.pointerId);
    updateBox();
  });

  surface?.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    latestX = event.clientX;
    latestY = event.clientY;
    updateBox();
  });

  surface?.addEventListener("pointerup", (event) => {
    if (!dragging) return;
    dragging = false;
    latestX = event.clientX;
    latestY = event.clientY;
    const x = Math.min(startX, latestX);
    const y = Math.min(startY, latestY);
    const width = Math.abs(latestX - startX);
    const height = Math.abs(latestY - startY);
    layer.remove();

    if (width < 8 || height < 8) {
      return;
    }

    onSelect({
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(width),
      height: Math.round(height)
    });
  });
}

function startPinMode(onSelect: (pin: PinTarget) => void): void {
  const previousCursor = document.documentElement.style.cursor;
  document.documentElement.style.cursor = "crosshair";

  const handleClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    document.documentElement.style.cursor = previousCursor;
    document.removeEventListener("click", handleClick, true);

    const target = event.target instanceof Element ? event.target : undefined;
    onSelect({
      x: event.clientX + window.scrollX,
      y: event.clientY + window.scrollY,
      selector: target ? buildSelector(target) : undefined,
      text: target?.textContent?.trim().slice(0, 120)
    });
  };

  document.addEventListener("click", handleClick, true);
}

async function captureViewport(area?: CaptureArea): Promise<string | undefined> {
  try {
    maskSensitiveFields(true);
    const canvas = await capturePage(document.body, {
      height: window.innerHeight,
      width: window.innerWidth,
      windowHeight: window.innerHeight,
      windowWidth: window.innerWidth,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      useCORS: true
    });
    const output = area ? cropCanvas(canvas, area) : canvas;
    return output.toDataURL("image/jpeg", 0.82);
  } finally {
    maskSensitiveFields(false);
  }
}

function cropCanvas(source: HTMLCanvasElement, area: CaptureArea): HTMLCanvasElement {
  const ratio = window.devicePixelRatio || 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(area.width * ratio));
  canvas.height = Math.max(1, Math.round(area.height * ratio));
  const context = canvas.getContext("2d");

  if (!context) {
    return source;
  }

  context.drawImage(
    source,
    Math.round(area.x * ratio),
    Math.round(area.y * ratio),
    canvas.width,
    canvas.height,
    0,
    0,
    canvas.width,
    canvas.height
  );
  return canvas;
}

function maskSensitiveFields(enabled: boolean): void {
  document.querySelectorAll<HTMLElement>("input, textarea, select, [contenteditable='true'], [data-changethis-mask], [data-changethis-exclude]").forEach((element) => {
    if (enabled) {
      element.dataset.changethisPreviousVisibility = element.style.visibility;
      element.style.visibility = "hidden";
    } else {
      element.style.visibility = element.dataset.changethisPreviousVisibility ?? "";
      delete element.dataset.changethisPreviousVisibility;
    }
  });
}

function pinViewportPosition(pin: PinTarget): { x: number; y: number } {
  return {
    x: pin.x - window.scrollX,
    y: pin.y - window.scrollY
  };
}

function feedbackMeta(
  state: { pin?: PinTarget; captureArea?: CaptureArea },
  fallback: string
): string {
  if (state.pin) {
    return `Pin: x=${Math.round(state.pin.x)}, y=${Math.round(state.pin.y)}`;
  }

  if (state.captureArea) {
    return `Capture: ${Math.round(state.captureArea.width)}x${Math.round(state.captureArea.height)}`;
  }

  return escapeHtml(fallback);
}

function buildSelector(element: Element): string {
  if (element.id) {
    return `#${CSS.escape(element.id)}`;
  }

  const classes = Array.from(element.classList).slice(0, 3).map((className) => `.${CSS.escape(className)}`).join("");
  return `${element.tagName.toLowerCase()}${classes}`;
}

function inferEndpoint(): string {
  const script = document.currentScript as HTMLScriptElement | null;
  const endpoint = script?.dataset.endpoint;
  if (endpoint) return endpoint;

  if (script?.src) {
    return new URL("/api/public/feedback", script.src).toString();
  }

  return "/api/public/feedback";
}

function inferLocale(): "fr" | "en" {
  const script = document.currentScript as HTMLScriptElement | null;
  const scriptLocale = script?.dataset.locale;
  if (scriptLocale === "fr" || scriptLocale === "en") {
    return scriptLocale;
  }

  const storedLocale = window.localStorage.getItem(languageStorageKey);
  if (storedLocale === "fr" || storedLocale === "en") {
    return storedLocale;
  }

  return document.documentElement.lang.toLowerCase().startsWith("fr") ? "fr" : "en";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const currentScript = document.currentScript as HTMLScriptElement | null;
const projectKey = currentScript?.dataset.project;

if (projectKey) {
  const variant = currentScript?.dataset.buttonVariant;

  initChangeThis({
    projectKey,
    endpoint: currentScript?.dataset.endpoint,
    buttonLabel: currentScript?.dataset.buttonLabel,
    buttonStateLabel: currentScript?.dataset.buttonState,
    buttonVariant: variant === "dev" || variant === "prod" || variant === "review" ? variant : undefined,
    locale: currentScript?.dataset.locale === "fr" || currentScript?.dataset.locale === "en" ? currentScript.dataset.locale : undefined,
    visible: currentScript?.dataset.visible !== "false"
  });
}
