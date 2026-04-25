import html2canvas from "html2canvas";
import type { FeedbackPayload, FeedbackType, PinTarget } from "@changethis/shared";

const capturePage = html2canvas as unknown as typeof import("html2canvas").default;

type WidgetOptions = {
  projectKey: string;
  endpoint?: string;
};

const rootId = "changethis-widget-root";

export function initChangeThis(options: WidgetOptions): void {
  if (!options.projectKey || document.getElementById(rootId)) {
    return;
  }

  const endpoint = options.endpoint ?? inferEndpoint();
  const root = document.createElement("div");
  root.id = rootId;
  root.attachShadow({ mode: "open" });
  document.documentElement.appendChild(root);

  const state = {
    open: false,
    type: "comment" as FeedbackType,
    pin: undefined as PinTarget | undefined,
    sending: false,
    message: ""
  };

  const render = () => {
    const shadow = root.shadowRoot;
    if (!shadow) return;

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
          font-size: 14px;
          font-weight: 700;
          padding: 12px 16px;
          box-shadow: 0 12px 30px rgba(17, 24, 39, 0.22);
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
      </style>
      ${state.pin ? `<div class="pin" style="left:${state.pin.x}px;top:${state.pin.y}px">1</div>` : ""}
      <button class="button" data-action="toggle">Feedback</button>
      ${state.open ? `
        <section class="panel" aria-label="Envoyer un feedback">
          <p class="title">Que faut-il changer ?</p>
          <div class="modes">
            <button class="mode" data-mode="comment" data-active="${state.type === "comment"}">Note</button>
            <button class="mode" data-mode="pin" data-active="${state.type === "pin"}">Pin</button>
            <button class="mode" data-mode="screenshot" data-active="${state.type === "screenshot"}">Capture</button>
          </div>
          <textarea placeholder="Décris le retour client ici">${escapeHtml(state.message)}</textarea>
          <p class="meta">${state.pin ? `Pin: x=${state.pin.x}, y=${state.pin.y}` : "URL, navigateur et viewport seront ajoutés automatiquement."}</p>
          <div class="actions">
            <button class="cancel" data-action="close">Fermer</button>
            <button class="send" data-action="send" ${state.sending ? "disabled" : ""}>${state.sending ? "Envoi..." : "Envoyer"}</button>
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
        if (state.type === "pin") {
          startPinMode((pin) => {
            state.pin = pin;
            state.open = true;
            render();
          });
          state.open = false;
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
          pin: state.pin
        });
        state.message = "";
        state.pin = undefined;
        state.type = "comment";
        state.open = false;
      } catch (error) {
        console.error("[ChangeThis] Failed to send feedback", error);
        window.alert("Impossible d'envoyer le feedback. Réessaie dans un instant.");
      } finally {
        state.sending = false;
        render();
      }
    });
  };

  render();
}

async function submitFeedback(params: {
  endpoint: string;
  projectKey: string;
  type: FeedbackType;
  message: string;
  pin?: PinTarget;
}) {
  const screenshotDataUrl = params.type === "screenshot" || params.type === "pin"
    ? await captureViewport()
    : undefined;

  const payload: FeedbackPayload = {
    projectKey: params.projectKey,
    type: params.type,
    message: params.message,
    pin: params.pin,
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
      x: event.clientX,
      y: event.clientY,
      selector: target ? buildSelector(target) : undefined,
      text: target?.textContent?.trim().slice(0, 120)
    });
  };

  document.addEventListener("click", handleClick, true);
}

async function captureViewport(): Promise<string | undefined> {
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
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    maskSensitiveFields(false);
  }
}

function maskSensitiveFields(enabled: boolean): void {
  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea, [contenteditable='true']").forEach((element) => {
    if (enabled) {
      element.dataset.changethisPreviousVisibility = element.style.visibility;
      element.style.visibility = "hidden";
    } else {
      element.style.visibility = element.dataset.changethisPreviousVisibility ?? "";
      delete element.dataset.changethisPreviousVisibility;
    }
  });
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
  initChangeThis({
    projectKey,
    endpoint: currentScript?.dataset.endpoint
  });
}
