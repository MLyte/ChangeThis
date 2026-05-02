import html2canvas from "html2canvas";
import type { CaptureArea, FeedbackAppEnvironment, FeedbackPayload, FeedbackType, PinTarget } from "@changethis/shared";
import { inferEndpoint, inferLocale } from "./inference.js";

const capturePage = html2canvas as unknown as typeof import("html2canvas").default;

type WidgetOptions = {
  projectKey: string;
  endpoint?: string;
  buttonLabel?: string;
  buttonStateLabel?: string;
  buttonVariant?: "default" | "dev" | "prod" | "review" | "subtle";
  buttonPosition?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  locale?: "fr" | "en";
  visible?: boolean;
  environment?: string;
  release?: string;
  appVersion?: string;
  buildId?: string;
  commitSha?: string;
  branch?: string;
  testRunId?: string;
  scenario?: string;
  customer?: string;
};

type DraftPin = {
  number: number;
  target: PinTarget;
  message: string;
  status: "draft" | "sent";
  feedbackId?: string;
  sentAt?: string;
};

type StoredSentPin = {
  viewKey: string;
  number: number;
  feedbackId: string;
  target: PinTarget;
  message: string;
  sentAt: string;
};

type StoredSentFeedback = {
  viewKey: string;
  feedbackId: string;
  type: Extract<FeedbackType, "comment" | "screenshot">;
  message: string;
  sentAt: string;
  captureArea?: CaptureArea;
  screenshotDataUrl?: string;
};

const rootId = "changethis-widget-root";
const sentPinsStorageKeyPrefix = "changethis:sentPins:";
const sentFeedbacksStorageKeyPrefix = "changethis:sentFeedbacks:";
const productWebsiteUrl = "https://app.changethis.dev";
const lucideIcons = {
  camera: '<svg class="lucide-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z"/><circle cx="12" cy="13" r="3"/></svg>',
  "map-pin": '<svg class="lucide-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>',
  "message-square": '<svg class="lucide-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  pencil: '<svg class="lucide-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  plus: '<svg class="lucide-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
  send: '<svg class="lucide-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>',
  trash: '<svg class="lucide-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  undo: '<svg class="lucide-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 1 1 0 11H11"/></svg>',
  x: '<svg class="lucide-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>'
};
const brandMark = '<svg class="brand-mark" aria-hidden="true" viewBox="0 0 28 28"><path d="M14.6 3.9c1.1.1 2 .9 2.2 2l.1.9.6-.2c1.1-.3 2.2.3 2.6 1.3.2.5.2 1 .1 1.5l-.2.7.4-.1c1.1-.1 2.1.6 2.4 1.7.2.7 0 1.4-.4 2l-5.4 7.5c-.7 1-1.8 1.6-3 1.8l-1.5.2c-1.7.2-3.4-.4-4.5-1.7l-3.7-4.2c-.7-.8-.6-2 .1-2.7.7-.7 1.8-.7 2.6-.1l1.3 1V7c0-1.2.9-2.2 2.1-2.3 1-.1 1.8.4 2.3 1.2.4-1.2 1.4-2.1 2.8-2Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 6.8v7.1M16.9 6.8v6.7M20 10.1v4.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
const widgetCopy = {
  fr: {
    button: "Feedback",
    brandLabel: "Découvrir",
    title: "Que faut-il changer ?",
    note: "Retour page",
    pin: "Pin",
    screenshot: "Capture",
    placeholder: "Décris le retour global sur cette page",
    capturePlaceholder: "Décris ce qu'il faut corriger dans cette capture",
    metaDefault: "URL, navigateur et viewport seront ajoutés automatiquement.",
    shortcutHint: "Ctrl + Entrée pour envoyer l'action en cours",
    shortcutHintAll: "Ctrl + Entrée pour envoyer l'action en cours",
    close: "Fermer",
    sending: "Envoi...",
    send: "Envoyer",
    sendAll: "Tout envoyer",
    sendAllPending: "Envoyer tous les retours en attente",
    sendPendingCount: "Envoyer {count} retours en attente",
    selectArea: "Trace la zone à capturer",
    defineCapture: "Définir la zone",
    addPin: "Ajouter une pin",
    pins: "Pins",
    pinPlaceholder: "Décris cette correction",
    removePin: "Supprimer la pin",
    sentPin: "Envoyée",
    manageFeedbacks: "Gérer les feedbacks",
    sentFeedbacks: "Feedbacks envoyés",
    draftFeedbacks: "À compléter",
    createdFeedbacks: "Feedbacks créés",
    noteFeedbacks: "Retours page",
    pinFeedbacks: "Pins",
    captureFeedbacks: "Captures",
    draftStatus: "Brouillon",
    addText: "Ajouter texte",
    missingText: "Texte manquant",
    editFeedback: "Modifier",
    deleteFeedback: "Supprimer",
    cancelFeedback: "Retirer l'envoi",
    noSentFeedback: "Aucun feedback envoyé sur cette page.",
    noDraftFeedback: "Aucun feedback en brouillon sur cette page.",
    canceled: "Feedback annulé.",
    sent: "Feedback envoyé. Merci.",
    alertError: "Impossible d'envoyer le feedback. Réessaie dans un instant."
  },
  en: {
    button: "Feedback",
    brandLabel: "Discover",
    title: "What should change?",
    note: "Page review",
    pin: "Pin",
    screenshot: "Screenshot",
    placeholder: "Describe the page-level feedback here",
    capturePlaceholder: "Describe what should change in this capture",
    metaDefault: "URL, browser and viewport will be added automatically.",
    shortcutHint: "Ctrl + Enter to send the current action",
    shortcutHintAll: "Ctrl + Enter to send the current action",
    close: "Close",
    sending: "Sending...",
    send: "Send",
    sendAll: "Send all",
    sendAllPending: "Send all pending feedbacks",
    sendPendingCount: "Send {count} pending feedbacks",
    selectArea: "Drag the area to capture",
    defineCapture: "Define area",
    addPin: "Add pin",
    pins: "Pins",
    pinPlaceholder: "Describe this correction",
    removePin: "Remove pin",
    sentPin: "Sent",
    manageFeedbacks: "Manage feedback",
    sentFeedbacks: "Sent feedback",
    draftFeedbacks: "To complete",
    createdFeedbacks: "Created feedback",
    noteFeedbacks: "Page reviews",
    pinFeedbacks: "Pins",
    captureFeedbacks: "Screenshots",
    draftStatus: "Draft",
    addText: "Add text",
    missingText: "Missing text",
    editFeedback: "Edit",
    deleteFeedback: "Delete",
    cancelFeedback: "Withdraw",
    noSentFeedback: "No feedback sent on this page.",
    noDraftFeedback: "No draft feedback on this page.",
    canceled: "Feedback canceled.",
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
  const buttonPosition = options.buttonPosition ?? "bottom-right";
  const appEnvironment = buildAppEnvironment(options);
  const sentPinsStorageKey = `${sentPinsStorageKeyPrefix}${options.projectKey}`;
  const sentFeedbacksStorageKey = `${sentFeedbacksStorageKeyPrefix}${options.projectKey}`;
  const currentPins = loadSentPinsForView(sentPinsStorageKey, currentViewKey());
  const currentSentFeedbacks = loadSentFeedbacksForView(sentFeedbacksStorageKey, currentViewKey());
  const root = document.createElement("div");
  root.id = rootId;
  root.attachShadow({ mode: "open" });
  document.documentElement.appendChild(root);

  const updateFloatingOffset = () => {
    root.style.setProperty("--ct-footer-offset", `${buttonPosition.startsWith("bottom") ? footerAvoidanceOffset() : 0}px`);
  };

  const state = {
    open: false,
    type: "comment" as FeedbackType,
    viewKey: currentViewKey(),
    pins: currentPins,
    sentFeedbacks: currentSentFeedbacks,
    nextPinNumber: nextAvailablePinNumber(currentPins),
    draftViewKey: undefined as string | undefined,
    captureArea: undefined as CaptureArea | undefined,
    sending: false,
    noteMessage: "",
    captureMessage: "",
    managerOpen: false,
    notice: "",
    focusPinIndex: undefined as number | undefined
  };

  const clearViewBoundDraft = () => {
    state.pins = loadSentPinsForView(sentPinsStorageKey, currentViewKey());
    state.sentFeedbacks = loadSentFeedbacksForView(sentFeedbacksStorageKey, currentViewKey());
    state.nextPinNumber = nextAvailablePinNumber(state.pins);
    state.captureArea = undefined;
    state.captureMessage = "";
    state.draftViewKey = undefined;
    if (state.type === "pin" || state.type === "screenshot") {
      state.type = "comment";
    }
  };

  const syncView = (): boolean => {
    const viewKey = currentViewKey();
    if (state.viewKey === viewKey) {
      return false;
    }

    state.viewKey = viewKey;
    clearViewBoundDraft();
    return true;
  };

  const syncDraftView = (): boolean => {
    if (syncView()) {
      return true;
    }

    if (!state.draftViewKey || state.draftViewKey === currentViewKey()) {
      return false;
    }

    clearViewBoundDraft();
    return true;
  };

  const updatePinnedMarkers = () => {
    root.shadowRoot?.querySelectorAll<HTMLElement>(".pin").forEach((marker) => {
      const index = Number(marker.dataset.pinIndex);
      const pin = state.pins[index];
      if (!pin) return;

      const position = pinViewportPosition(pin.target);
      marker.style.left = `${position.x}px`;
      marker.style.top = `${position.y}px`;
    });
  };

  const focusPinMessage = (index: number, attempt = 0) => {
    const textarea = root.shadowRoot?.querySelector<HTMLTextAreaElement>(`[data-pin-message-index="${index}"]`);

    if (textarea) {
      textarea.scrollIntoView({ block: "nearest" });
      textarea.focus({ preventScroll: true });
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);

      if (root.shadowRoot?.activeElement === textarea || attempt >= 5) {
        return;
      }
    } else if (attempt >= 5) {
      return;
    }

    window.setTimeout(() => focusPinMessage(index, attempt + 1), 40);
  };

  const requestPin = () => {
    syncDraftView();
    const viewKey = currentViewKey();
    state.type = "pin";
    state.draftViewKey = viewKey;
    state.captureArea = undefined;
    state.notice = "";
    state.open = false;
    render();
    startPinMode((pin) => {
      if (currentViewKey() !== viewKey) {
        clearViewBoundDraft();
        render();
        return;
      }

      const nextPinIndex = state.pins.length;
      state.pins = [...state.pins, { number: state.nextPinNumber, target: pin, message: "", status: "draft" }];
      state.nextPinNumber += 1;
      state.open = true;
      state.focusPinIndex = nextPinIndex;
      render();
    });
  };

  const requestCaptureArea = () => {
    syncDraftView();
    const viewKey = currentViewKey();
    state.type = "screenshot";
    state.draftViewKey = viewKey;
    state.open = false;
    render();
    startCaptureSelection(copy.selectArea, (area) => {
      if (currentViewKey() !== viewKey) {
        clearViewBoundDraft();
        render();
        return;
      }

      state.captureArea = area;
      state.open = true;
      render();
    }, () => {
      state.type = "screenshot";
      state.open = true;
      render();
    });
  };

  const render = () => {
    const shadow = root.shadowRoot;
    if (!shadow) return;

    updateFloatingOffset();
    syncDraftView();
    const pinMarkers = state.pins.map((pin, index) => {
      const position = pinViewportPosition(pin.target);
      return `<div class="pin" data-pin-index="${index}" data-status="${pin.status}" style="left:${position.x}px;top:${position.y}px">${pin.number}</div>`;
    }).join("");
    const isPinTab = state.type === "pin";
    const isCaptureTab = state.type === "screenshot";
    const hasPins = isPinTab && state.pins.length > 0;
    const sentPins = state.pins.filter((pin) => pin.status === "sent");
    const draftPins = state.pins
      .map((pin, index) => ({ pin, index }))
      .filter((entry) => entry.pin.status === "draft");
    const draftNotes = state.noteMessage.trim() ? [{
      id: "note-draft",
      title: copy.note,
      message: state.noteMessage,
      status: "draft" as const
    }] : [];
    const sentNotes = state.sentFeedbacks.filter((feedback) => feedback.type === "comment");
    const draftCaptures = state.captureMessage.trim() || state.captureArea ? [{
      id: "capture-draft",
      title: copy.screenshot,
      message: state.captureMessage || feedbackMeta({ captureArea: state.captureArea }, copy.metaDefault),
      status: "draft" as const
    }] : [];
    const sentCaptures = state.sentFeedbacks.filter((feedback) => feedback.type === "screenshot");
    const totalDraftFeedbacks = draftNotes.length + draftPins.length + draftCaptures.length;
    const totalSentFeedbacks = sentNotes.length + sentPins.length + sentCaptures.length;
    const totalFeedbacks = totalDraftFeedbacks + totalSentFeedbacks;
    const getReadyDraftFeedbackCount = () => (state.noteMessage.trim() ? 1 : 0)
      + state.pins.filter((pin) => pin.status === "draft" && pin.message.trim()).length
      + (state.captureArea && state.captureMessage.trim() ? 1 : 0);
    const readyDraftFeedbackCount = getReadyDraftFeedbackCount();
    const canSend = !state.sending && readyDraftFeedbackCount > 0;
    const sendLabel = state.sending
      ? copy.sending
      : readyDraftFeedbackCount > 1
        ? copy.sendPendingCount.replace("{count}", String(readyDraftFeedbackCount))
        : copy.sendAllPending;

    shadow.innerHTML = `
      <style>
        :host { all: initial; }
        * { box-sizing: border-box; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        .button {
          position: fixed;
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
        .button[data-position="bottom-right"] { right: 20px; bottom: calc(20px + var(--ct-footer-offset, 0px)); }
        .button[data-position="bottom-left"] { left: 20px; bottom: calc(20px + var(--ct-footer-offset, 0px)); }
        .button[data-position="top-right"] { right: 20px; top: 20px; }
        .button[data-position="top-left"] { left: 20px; top: 20px; }
        .button[data-variant="dev"] { background: #1d4ed8; }
        .button[data-variant="prod"] { background: #0f766e; }
        .button[data-variant="review"] { background: #7c2d12; }
        .button[data-variant="subtle"] {
          background: rgba(17, 24, 39, 0.72);
          border: 1px solid rgba(255, 255, 255, 0.44);
          color: #fff;
          opacity: 0.46;
          padding: 10px 12px;
          transform: scale(0.92);
          transform-origin: bottom right;
        }
        .button[data-variant="subtle"]:hover,
        .button[data-variant="subtle"]:focus-visible,
        .button[data-variant="subtle"][aria-expanded="true"] {
          opacity: 1;
          transform: scale(1);
        }
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
          z-index: 2147483647;
          width: min(340px, calc(100vw - 32px));
          border: 1px solid #d1d5db;
          border-radius: 8px;
          background: #fff;
          color: #111827;
          box-shadow: 0 20px 50px rgba(17, 24, 39, 0.18);
          padding: 14px;
        }
        .panel[data-position="bottom-right"] { right: 20px; bottom: calc(76px + var(--ct-footer-offset, 0px)); }
        .panel[data-position="bottom-left"] { left: 20px; bottom: calc(76px + var(--ct-footer-offset, 0px)); }
        .panel[data-position="top-right"] { right: 20px; top: 76px; }
        .panel[data-position="top-left"] { left: 20px; top: 76px; }
        .panel-header {
          align-items: center;
          display: flex;
          gap: 8px;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .panel-brand {
          align-items: center;
          display: inline-flex;
          gap: 6px;
          min-width: 0;
          text-decoration: none;
        }
        .panel-brand strong {
          color: #111827;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0;
          line-height: 1;
        }
        .panel-brand .brand-mark {
          color: #111827;
          flex: 0 0 auto;
          height: 17px;
          width: 17px;
        }
        .panel-brand:hover strong {
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .panel-header-actions {
          align-items: center;
          display: inline-flex;
          flex: 0 0 auto;
          gap: 8px;
        }
        .brand-discovery-link {
          color: #6b7280;
          flex: 0 0 auto;
          font-size: 11px;
          font-weight: 750;
          line-height: 1;
          text-decoration: none;
        }
        .brand-discovery-link:hover {
          color: #111827;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .title { font-size: 14px; font-weight: 800; margin: 0; }
        .modes {
          border-bottom: 1px solid #e5e7eb;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0;
          margin-bottom: 12px;
        }
        .mode, .send, .cancel {
          align-items: center;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: #f9fafb;
          color: #111827;
          cursor: pointer;
          display: inline-flex;
          font-size: 12px;
          font-weight: 700;
          gap: 6px;
          justify-content: center;
          min-height: 34px;
          padding: 8px;
        }
        .mode {
          border: 0;
          border-bottom: 2px solid transparent;
          border-radius: 0;
          background: transparent;
          color: #6b7280;
          margin-bottom: -1px;
          min-height: 38px;
          padding: 8px 6px 10px;
        }
        .mode:hover {
          background: #f9fafb;
          color: #111827;
        }
        .mode[data-active="true"] {
          border-bottom-color: #111827;
          background: transparent;
          color: #111827;
        }
        .lucide-icon {
          flex: 0 0 auto;
          fill: none;
          height: 15px;
          stroke: currentColor;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-width: 2;
          width: 15px;
        }
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
        .shortcut-hint {
          color: #6b7280;
          font-size: 11px;
          font-weight: 750;
          line-height: 1.3;
          margin: 5px 0 0;
        }
        .selection-summary {
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          margin-top: 8px;
          padding: 8px 10px;
        }
        .selection-header {
          align-items: center;
          display: flex;
          gap: 8px;
          justify-content: space-between;
          margin-bottom: 6px;
        }
        .selection-header span {
          color: #374151;
          font-size: 12px;
          font-weight: 700;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .pin-list {
          display: grid;
          gap: 6px;
          margin: 0;
          padding: 0;
        }
        .pin-item {
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          display: grid;
          gap: 7px;
          list-style: none;
          padding: 8px;
        }
        .pin-item-header {
          align-items: center;
          display: grid;
          gap: 8px;
          grid-template-columns: auto minmax(0, 1fr) auto;
        }
        .pin-index {
          border-radius: 999px;
          background: #e11d48;
          color: #fff;
          display: grid;
          font-size: 11px;
          font-weight: 800;
          height: 22px;
          place-items: center;
          width: 22px;
        }
        .pin-label {
          color: #4b5563;
          font-size: 12px;
          font-weight: 700;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .pin-message {
          min-height: 62px;
          resize: vertical;
        }
        .pin-actions {
          align-items: center;
          display: flex;
          gap: 6px;
          justify-content: space-between;
        }
        .pin-status {
          border-radius: 999px;
          background: #dcfce7;
          color: #166534;
          font-size: 11px;
          font-weight: 900;
          padding: 5px 7px;
        }
        .clear-selection {
          border: 0;
          border-radius: 5px;
          background: #fee2e2;
          color: #991b1b;
          cursor: pointer;
          flex: 0 0 auto;
          height: 28px;
          justify-content: center;
          padding: 0;
          width: 28px;
        }
        .add-pin {
          align-items: center;
          border: 1px solid #d1d5db;
          border-radius: 5px;
          background: #fff;
          color: #111827;
          cursor: pointer;
          display: inline-flex;
          font-size: 12px;
          font-weight: 800;
          gap: 6px;
          justify-content: center;
          min-height: 28px;
          padding: 5px 8px;
        }
        .manager-button {
          align-items: center;
          border-radius: 6px;
          cursor: pointer;
          display: inline-flex;
          font-size: 12px;
          font-weight: 850;
          gap: 6px;
          justify-content: center;
          min-height: 32px;
          padding: 6px 10px;
          white-space: nowrap;
        }
        .manager-button.secondary {
          border: 1px solid #d1d5db;
          background: #fff;
          color: #374151;
        }
        .manager-button.danger {
          border: 1px solid #fecaca;
          background: #fff1f2;
          color: #be123c;
        }
        .manager-button.icon-only {
          padding: 0;
          width: 32px;
        }
        .manager-button:disabled {
          cursor: wait;
          opacity: .65;
        }
        .panel-link {
          border: 0;
          background: transparent;
          color: #4b5563;
          cursor: pointer;
          font-size: 12px;
          font-weight: 800;
          padding: 0;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .manager-backdrop {
          position: fixed;
          inset: 0;
          z-index: 2147483647;
          background: rgba(17, 24, 39, 0.54);
        }
        .manager-modal {
          position: fixed;
          left: 50%;
          top: 50%;
          z-index: 2147483647;
          width: min(760px, calc(100vw - 32px));
          max-height: min(720px, calc(100vh - 32px));
          border: 1px solid #d1d5db;
          border-radius: 8px;
          background: #fff;
          color: #111827;
          box-shadow: 0 20px 50px rgba(17, 24, 39, 0.2);
          display: grid;
          gap: 14px;
          overflow: auto;
          padding: 18px;
          transform: translate(-50%, -50%);
        }
        .manager-header {
          align-items: start;
          display: flex;
          gap: 16px;
          justify-content: space-between;
        }
        .manager-header h2 {
          color: #111827;
          font-size: 22px;
          line-height: 1.1;
          margin: 0;
        }
        .manager-header p {
          color: #6b7280;
          font-size: 13px;
          line-height: 1.4;
          margin: 6px 0 0;
        }
        .manager-stats {
          display: grid;
          gap: 8px;
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        .manager-stat {
          border: 1px solid #e5e7eb;
          border-radius: 7px;
          background: #f9fafb;
          display: grid;
          gap: 2px;
          padding: 10px;
        }
        .manager-stat strong {
          color: #111827;
          font-size: 18px;
          line-height: 1;
        }
        .manager-stat span {
          color: #6b7280;
          font-size: 11px;
          font-weight: 850;
          text-transform: uppercase;
        }
        .manager-section {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          display: grid;
          gap: 12px;
          padding: 14px;
        }
        .manager-section-heading {
          align-items: center;
          display: flex;
          gap: 12px;
          justify-content: space-between;
          min-height: 28px;
        }
        .manager-section-heading h3 {
          align-items: center;
          color: #111827;
          display: inline-flex;
          font-size: 14px;
          gap: 8px;
          line-height: 1.2;
          margin: 0;
        }
        .manager-section-heading h3 .lucide-icon {
          flex: 0 0 auto;
          height: 16px;
          width: 16px;
        }
        .manager-section-heading span {
          border-radius: 999px;
          background: #f3f4f6;
          color: #4b5563;
          font-size: 11px;
          font-weight: 900;
          padding: 5px 7px;
        }
        .manager-list {
          display: grid;
          gap: 8px;
          margin: 0;
          padding: 0;
        }
        .manager-item {
          align-items: center;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          display: grid;
          gap: 8px;
          grid-template-columns: auto minmax(0, 1fr) auto;
          list-style: none;
          padding: 8px;
        }
        .manager-copy {
          display: grid;
          gap: 3px;
          min-width: 0;
        }
        .manager-copy strong,
        .manager-copy span {
          color: #374151;
          font-size: 12px;
          font-weight: 800;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .manager-copy span {
          color: #6b7280;
          font-weight: 700;
        }
        .manager-capture-preview {
          align-items: center;
          border: 1px solid #d1d5db;
          border-radius: 7px;
          background: #f8fafc;
          color: #111827;
          cursor: zoom-in;
          display: inline-grid;
          gap: 7px;
          grid-template-columns: 72px minmax(0, 1fr);
          margin-top: 6px;
          max-width: 280px;
          padding: 6px;
          text-decoration: none;
        }
        .manager-capture-preview img {
          border: 1px solid #e5e7eb;
          border-radius: 5px;
          height: 48px;
          object-fit: cover;
          width: 72px;
        }
        .manager-capture-preview span {
          color: #111827;
          font-size: 12px;
          font-weight: 850;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .manager-actions {
          display: flex;
          gap: 6px;
          justify-content: flex-end;
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
        .pin[data-status="sent"] {
          background: #0f766e;
          box-shadow: 0 8px 22px rgba(15, 118, 110, 0.28);
        }
        .notice {
          position: fixed;
          right: 20px;
          bottom: calc(76px + var(--ct-footer-offset, 0px));
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
        @media (max-width: 640px) {
          .manager-header {
            flex-direction: column;
          }
          .manager-stats,
          .manager-item {
            grid-template-columns: 1fr;
          }
          .manager-actions {
            justify-content: flex-start;
          }
        }
      </style>
      ${pinMarkers}
      ${state.notice ? `<div class="notice" role="status">${escapeHtml(state.notice)}</div>` : ""}
      <button class="button" data-action="toggle" data-position="${buttonPosition}" data-variant="${buttonVariant}" aria-expanded="${state.open}">
        <span>${escapeHtml(buttonLabel)}</span>
        ${buttonStateLabel ? `<span class="button-state">${escapeHtml(buttonStateLabel)}</span>` : ""}
      </button>
      ${state.open ? `
        <section class="panel" data-position="${buttonPosition}" aria-label="Envoyer un feedback">
          <div class="panel-header">
            <a class="panel-brand" href="${productWebsiteUrl}" target="_blank" rel="noopener noreferrer" aria-label="ChangeThis">
              <strong>ChangeThis</strong>
              ${brandMark}
            </a>
            <div class="panel-header-actions">
              <a class="brand-discovery-link" href="${productWebsiteUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(copy.brandLabel)}</a>
              ${totalFeedbacks ? `<button class="panel-link" data-action="open-manager">${escapeHtml(copy.manageFeedbacks)}</button>` : ""}
            </div>
          </div>
          <p class="title">${escapeHtml(copy.title)}</p>
          <div class="modes">
            <button class="mode" data-mode="comment" data-active="${state.type === "comment"}">${lucideIcons["message-square"]}${escapeHtml(copy.note)}</button>
            <button class="mode" data-mode="pin" data-active="${state.type === "pin"}">${lucideIcons["map-pin"]}${escapeHtml(copy.pin)}</button>
            <button class="mode" data-mode="screenshot" data-active="${state.type === "screenshot"}">${lucideIcons.camera}${escapeHtml(copy.screenshot)}</button>
          </div>
          ${state.type === "comment" ? `
            <textarea data-note-message placeholder="${escapeHtml(copy.placeholder)}">${escapeHtml(state.noteMessage)}</textarea>
            <p class="shortcut-hint">${escapeHtml(copy.shortcutHintAll)}</p>
            <p class="meta">${escapeHtml(copy.metaDefault)}</p>
          ` : ""}
          ${isPinTab ? `
            <div class="selection-summary">
              <div class="selection-header">
                <span>${escapeHtml(copy.pins)} (${state.pins.length})</span>
                <button class="add-pin" data-action="add-pin">${lucideIcons.plus}${escapeHtml(copy.addPin)}</button>
              </div>
              ${state.pins.length ? `<ul class="pin-list">
                ${state.pins.map((pin, index) => `
                  <li class="pin-item">
                    <div class="pin-item-header">
                      <span class="pin-index">${pin.number}</span>
                      <span class="pin-label" data-pin-label-index="${index}">${escapeHtml(draftPinLabel(pin, index, copy.missingText))}</span>
                      ${pin.status === "draft"
                        ? `<button class="clear-selection" data-action="remove-pin" data-pin-index="${index}" aria-label="${escapeHtml(`${copy.removePin} #${pin.number}`)}" title="${escapeHtml(`${copy.removePin} #${pin.number}`)}">${lucideIcons.trash}</button>`
                        : `<span class="pin-status">${escapeHtml(copy.sentPin)}</span>`}
                    </div>
                    ${pin.status === "sent" ? "" : `
                      <textarea class="pin-message" data-pin-message-index="${index}" placeholder="${escapeHtml(copy.pinPlaceholder)}">${escapeHtml(pin.message)}</textarea>
                      <p class="shortcut-hint">${escapeHtml(copy.shortcutHintAll)}</p>
                      <div class="pin-actions">
                        <span></span><button class="send" data-action="send-pin" data-pin-index="${index}" ${state.sending || !pin.message.trim() ? "disabled" : ""}>${lucideIcons.send}${state.sending ? escapeHtml(copy.sending) : escapeHtml(copy.send)}</button>
                      </div>
                    `}
                  </li>
                `).join("")}
              </ul>` : `<p class="meta">${escapeHtml(copy.metaDefault)}</p>`}
            </div>
          ` : ""}
          ${isCaptureTab ? `
            <textarea data-capture-message placeholder="${escapeHtml(copy.capturePlaceholder)}">${escapeHtml(state.captureMessage)}</textarea>
            <p class="shortcut-hint">${escapeHtml(copy.shortcutHintAll)}</p>
            <div class="selection-summary">
              <div class="selection-header">
                <span>${feedbackMeta({ captureArea: state.captureArea }, copy.metaDefault)}</span>
                <button class="add-pin" data-action="define-capture">${escapeHtml(copy.defineCapture)}</button>
              </div>
            </div>
          ` : ""}
          <div class="actions">
            <button class="cancel" data-action="close">${escapeHtml(copy.close)}</button>
            <button class="send" data-action="send" aria-label="${escapeHtml(copy.sendAllPending)}" title="${escapeHtml(copy.sendAllPending)}" ${canSend ? "" : "disabled"}>${lucideIcons.send}${escapeHtml(sendLabel)}</button>
          </div>
        </section>
      ` : ""}
      ${state.managerOpen ? `
        <button class="manager-backdrop" data-action="close-manager" aria-label="${escapeHtml(copy.close)}"></button>
        <section class="manager-modal" aria-labelledby="changethis-manager-title" role="dialog" aria-modal="true">
          <div class="manager-header">
            <div>
              <h2 id="changethis-manager-title">${escapeHtml(copy.manageFeedbacks)}</h2>
              <p>${escapeHtml(copy.createdFeedbacks)}: ${totalFeedbacks}</p>
            </div>
            <button class="manager-button secondary" data-action="close-manager">${lucideIcons.x}${escapeHtml(copy.close)}</button>
          </div>
          <div class="manager-stats">
            <div class="manager-stat"><strong>${totalFeedbacks}</strong><span>${escapeHtml(copy.createdFeedbacks)}</span></div>
            <div class="manager-stat"><strong>${totalDraftFeedbacks}</strong><span>${escapeHtml(copy.draftFeedbacks)}</span></div>
            <div class="manager-stat"><strong>${totalSentFeedbacks}</strong><span>${escapeHtml(copy.sentFeedbacks)}</span></div>
          </div>
          <div class="manager-section">
            <div class="manager-section-heading">
              <h3>${lucideIcons["message-square"]}${escapeHtml(copy.noteFeedbacks)}</h3>
              <span>${draftNotes.length + sentNotes.length}</span>
            </div>
            ${draftNotes.length || sentNotes.length ? `
              <ul class="manager-list">
                ${draftNotes.map((note) => `
                  <li class="manager-item">
                    <span class="pin-index">${lucideIcons["message-square"]}</span>
                    <div class="manager-copy">
                      <strong>${escapeHtml(note.title)}</strong>
                      <span>${escapeHtml(note.message)}</span>
                    </div>
                    <div class="manager-actions">
                      <button class="manager-button secondary" data-action="edit-note-feedback">${lucideIcons.pencil}${escapeHtml(copy.editFeedback)}</button>
                      <button class="manager-button danger icon-only" data-action="delete-note-feedback" aria-label="${escapeHtml(copy.deleteFeedback)}" title="${escapeHtml(copy.deleteFeedback)}">${lucideIcons.trash}</button>
                    </div>
                  </li>
                `).join("")}
                ${sentNotes.map((feedback) => `
                  <li class="manager-item">
                    <span class="pin-index">${lucideIcons["message-square"]}</span>
                    <div class="manager-copy">
                      <strong>${escapeHtml(copy.sentPin)}</strong>
                      <span>${escapeHtml(feedback.message || copy.note)}</span>
                    </div>
                    <div class="manager-actions">
                      <button class="manager-button danger" data-action="cancel-sent-feedback" data-feedback-id="${escapeHtml(feedback.feedbackId)}" data-feedback-kind="note" ${state.sending ? "disabled" : ""}>${lucideIcons.undo}${escapeHtml(copy.cancelFeedback)}</button>
                    </div>
                  </li>
                `).join("")}
              </ul>
            ` : `<p class="meta">${escapeHtml(copy.noDraftFeedback)}</p>`}
          </div>
          <div class="manager-section">
            <div class="manager-section-heading">
              <h3>${lucideIcons["map-pin"]}${escapeHtml(copy.pinFeedbacks)}</h3>
              <span>${state.pins.length}</span>
            </div>
            ${state.pins.length ? `
              <ul class="manager-list">
                ${draftPins.map(({ pin, index }) => `
                  <li class="manager-item">
                    <span class="pin-index">${pin.number}</span>
                    <div class="manager-copy">
                      <strong>${escapeHtml(draftPinLabel(pin, index, copy.missingText))}</strong>
                      <span>${escapeHtml(pin.message || copy.missingText)} · ${escapeHtml(copy.draftStatus)}</span>
                    </div>
                    <div class="manager-actions">
                      <button class="manager-button secondary" data-action="edit-draft-pin" data-pin-index="${index}">${lucideIcons.pencil}${escapeHtml(pin.message.trim() ? copy.editFeedback : copy.addText)}</button>
                      <button class="manager-button secondary" data-action="send-pin" data-pin-index="${index}" ${state.sending || !pin.message.trim() ? "disabled" : ""}>${lucideIcons.send}${escapeHtml(copy.send)}</button>
                      <button class="manager-button danger icon-only" data-action="remove-pin" data-pin-index="${index}" aria-label="${escapeHtml(`${copy.deleteFeedback} #${pin.number}`)}" title="${escapeHtml(`${copy.deleteFeedback} #${pin.number}`)}">${lucideIcons.trash}</button>
                    </div>
                  </li>
                `).join("")}
                ${sentPins.map((pin) => `
                  <li class="manager-item">
                    <span class="pin-index">${pin.number}</span>
                    <div class="manager-copy">
                      <strong>${escapeHtml(draftPinLabel(pin, pin.number - 1, copy.missingText))}</strong>
                      <span>${escapeHtml(pin.message || copy.sentPin)}</span>
                    </div>
                    <div class="manager-actions">
                      <button class="manager-button danger" data-action="cancel-sent-feedback" data-feedback-id="${escapeHtml(pin.feedbackId ?? "")}" ${state.sending ? "disabled" : ""}>${lucideIcons.undo}${escapeHtml(copy.cancelFeedback)}</button>
                    </div>
                  </li>
                `).join("")}
              </ul>
            ` : `<p class="meta">${escapeHtml(copy.noDraftFeedback)}</p>`}
          </div>
          <div class="manager-section">
            <div class="manager-section-heading">
              <h3>${lucideIcons.camera}${escapeHtml(copy.captureFeedbacks)}</h3>
              <span>${draftCaptures.length + sentCaptures.length}</span>
            </div>
            ${draftCaptures.length || sentCaptures.length ? `
              <ul class="manager-list">
                ${draftCaptures.map((capture) => `
                  <li class="manager-item">
                    <span class="pin-index">${lucideIcons.camera}</span>
                    <div class="manager-copy">
                      <strong>${escapeHtml(capture.title)}</strong>
                      <span>${escapeHtml(capture.message)} · ${escapeHtml(copy.draftStatus)}</span>
                    </div>
                    <div class="manager-actions">
                      <button class="manager-button secondary" data-action="edit-capture-feedback">${lucideIcons.pencil}${escapeHtml(copy.editFeedback)}</button>
                      <button class="manager-button danger icon-only" data-action="delete-capture-feedback" aria-label="${escapeHtml(copy.deleteFeedback)}" title="${escapeHtml(copy.deleteFeedback)}">${lucideIcons.trash}</button>
                    </div>
                  </li>
                `).join("")}
                ${sentCaptures.map((feedback) => `
                  <li class="manager-item">
                    <span class="pin-index">${lucideIcons.camera}</span>
                    <div class="manager-copy">
                      <strong>${escapeHtml(copy.sentPin)}</strong>
                      <span>${escapeHtml(feedback.message || feedbackMeta({ captureArea: feedback.captureArea }, copy.screenshot))}</span>
                      ${capturePreviewMarkup(feedback, copy.screenshot)}
                    </div>
                    <div class="manager-actions">
                      <button class="manager-button danger" data-action="cancel-sent-feedback" data-feedback-id="${escapeHtml(feedback.feedbackId)}" data-feedback-kind="capture" ${state.sending ? "disabled" : ""}>${lucideIcons.undo}${escapeHtml(copy.cancelFeedback)}</button>
                    </div>
                  </li>
                `).join("")}
              </ul>
            ` : `<p class="meta">${escapeHtml(copy.noDraftFeedback)}</p>`}
          </div>
        </section>
      ` : ""}
    `;

    const refreshDraftSendControls = () => {
      const mainSendButton = shadow.querySelector<HTMLButtonElement>("[data-action='send']");
      if (mainSendButton) {
        mainSendButton.disabled = state.sending || getReadyDraftFeedbackCount() === 0;
      }

      shadow.querySelectorAll<HTMLButtonElement>("[data-action='send-pin']").forEach((button) => {
        const index = Number(button.dataset.pinIndex);
        const pin = state.pins[index];
        button.disabled = state.sending || !pin || pin.status === "sent" || !pin.message.trim();
      });
    };

    const submitReadyFeedbackFromKeyboard = (event: KeyboardEvent, button: HTMLButtonElement | null) => {
      if (event.key !== "Enter" || (!event.ctrlKey && !event.metaKey) || !button || button.disabled) {
        return;
      }

      event.preventDefault();
      button.click();
    };

    shadow.querySelector<HTMLButtonElement>("[data-action='toggle']")?.addEventListener("click", () => {
      state.open = !state.open;
      render();
    });

    shadow.querySelector<HTMLButtonElement>("[data-action='close']")?.addEventListener("click", () => {
      state.open = false;
      render();
    });

    shadow.querySelector<HTMLButtonElement>("[data-action='open-manager']")?.addEventListener("click", () => {
      state.managerOpen = true;
      render();
    });

    shadow.querySelectorAll<HTMLButtonElement>("[data-action='close-manager']").forEach((button) => {
      button.addEventListener("click", () => {
        state.managerOpen = false;
        render();
      });
    });

    shadow.querySelectorAll<HTMLButtonElement>("[data-action='edit-draft-pin']").forEach((button) => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.pinIndex);
        state.managerOpen = false;
        state.open = true;
        state.type = "pin";
        state.focusPinIndex = index;
        render();
      });
    });

    shadow.querySelector<HTMLButtonElement>("[data-action='edit-note-feedback']")?.addEventListener("click", () => {
      state.managerOpen = false;
      state.open = true;
      state.type = "comment";
      render();
      window.requestAnimationFrame(() => {
        root.shadowRoot?.querySelector<HTMLTextAreaElement>("[data-note-message]")?.focus({ preventScroll: true });
      });
    });

    shadow.querySelector<HTMLButtonElement>("[data-action='delete-note-feedback']")?.addEventListener("click", () => {
      state.noteMessage = "";
      render();
    });

    shadow.querySelector<HTMLButtonElement>("[data-action='edit-capture-feedback']")?.addEventListener("click", () => {
      state.managerOpen = false;
      state.open = true;
      state.type = "screenshot";
      render();
      window.requestAnimationFrame(() => {
        root.shadowRoot?.querySelector<HTMLTextAreaElement>("[data-capture-message]")?.focus({ preventScroll: true });
      });
    });

    shadow.querySelector<HTMLButtonElement>("[data-action='delete-capture-feedback']")?.addEventListener("click", () => {
      state.captureMessage = "";
      state.captureArea = undefined;
      render();
    });

    shadow.querySelector<HTMLButtonElement>("[data-action='add-pin']")?.addEventListener("click", requestPin);
    shadow.querySelector<HTMLButtonElement>("[data-action='define-capture']")?.addEventListener("click", requestCaptureArea);

    shadow.querySelectorAll<HTMLButtonElement>("[data-action='remove-pin']").forEach((button) => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.pinIndex);
        state.pins = state.pins.filter((_, pinIndex) => pinIndex !== index);
        if (state.pins.length === 0 && state.type === "pin") {
          state.type = "comment";
          state.draftViewKey = undefined;
          state.nextPinNumber = 1;
        }
        render();
      });
    });

    shadow.querySelectorAll<HTMLTextAreaElement>("[data-pin-message-index]").forEach((textarea) => {
      textarea.addEventListener("input", (event) => {
        const index = Number((event.target as HTMLTextAreaElement).dataset.pinMessageIndex);
        const draft = state.pins[index];
        if (!draft || draft.status === "sent") return;

        state.pins[index] = {
          ...draft,
          message: (event.target as HTMLTextAreaElement).value
        };
        const label = shadow.querySelector<HTMLElement>(`[data-pin-label-index="${index}"]`);
        if (label) {
          label.textContent = draftPinLabel(state.pins[index], index, copy.missingText);
        }
        refreshDraftSendControls();
      });
      textarea.addEventListener("keydown", (event) => {
        const index = Number((event.target as HTMLTextAreaElement).dataset.pinMessageIndex);
        const button = shadow.querySelector<HTMLButtonElement>(`[data-action='send-pin'][data-pin-index="${index}"]`);
        submitReadyFeedbackFromKeyboard(event, button);
      });
    });

    if (typeof state.focusPinIndex === "number") {
      const pinIndex = state.focusPinIndex;
      state.focusPinIndex = undefined;
      window.requestAnimationFrame(() => {
        focusPinMessage(pinIndex);
      });
    }

    shadow.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        state.type = button.dataset.mode as FeedbackType;
        state.notice = "";
        render();
      });
    });

    const noteTextarea = shadow.querySelector<HTMLTextAreaElement>("[data-note-message]");
    noteTextarea?.addEventListener("input", (event) => {
      state.noteMessage = (event.target as HTMLTextAreaElement).value;
      refreshDraftSendControls();
    });
    noteTextarea?.addEventListener("keydown", (event) => {
      submitReadyFeedbackFromKeyboard(event, shadow.querySelector<HTMLButtonElement>("[data-action='send']"));
    });

    const captureTextarea = shadow.querySelector<HTMLTextAreaElement>("[data-capture-message]");
    captureTextarea?.addEventListener("input", (event) => {
      state.captureMessage = (event.target as HTMLTextAreaElement).value;
      refreshDraftSendControls();
    });
    captureTextarea?.addEventListener("keydown", (event) => {
      submitReadyFeedbackFromKeyboard(event, shadow.querySelector<HTMLButtonElement>("[data-action='send']"));
    });

    shadow.querySelectorAll<HTMLButtonElement>("[data-action='send-pin']").forEach((button) => {
      button.addEventListener("click", async () => {
        syncDraftView();
        const index = Number(button.dataset.pinIndex);
        const draft = state.pins[index];
        if (!draft || draft.status === "sent" || !draft.message.trim()) return;

        state.sending = true;
        render();
        try {
          const submitted = await submitFeedback({
            endpoint,
            projectKey: options.projectKey,
            type: "pin",
            message: draft.message,
            pins: [draft.target],
            appEnvironment
          });
          const sentAt = new Date().toISOString();
          state.pins[index] = {
            ...draft,
            status: "sent",
            feedbackId: submitted.id,
            sentAt
          };
          persistSentPin(sentPinsStorageKey, state.viewKey, state.pins[index]);
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
    });

    shadow.querySelectorAll<HTMLButtonElement>("[data-action='cancel-sent-feedback']").forEach((button) => {
      button.addEventListener("click", async () => {
        const feedbackId = button.dataset.feedbackId;
        if (!feedbackId) return;

        state.sending = true;
        render();
        try {
          await cancelFeedback({
            endpoint,
            feedbackId,
            projectKey: options.projectKey
          });
          state.pins = state.pins.filter((pin) => pin.feedbackId !== feedbackId);
          state.sentFeedbacks = state.sentFeedbacks.filter((feedback) => feedback.feedbackId !== feedbackId);
          removeStoredSentPin(sentPinsStorageKey, state.viewKey, feedbackId);
          removeStoredSentFeedback(sentFeedbacksStorageKey, state.viewKey, feedbackId);
          state.notice = copy.canceled;
          window.setTimeout(() => {
            state.notice = "";
            render();
          }, 3600);
        } catch (error) {
          console.error("[ChangeThis] Failed to cancel feedback", error);
          window.alert(copy.alertError);
        } finally {
          state.sending = false;
          render();
        }
      });
    });

    shadow.querySelector<HTMLButtonElement>("[data-action='send']")?.addEventListener("click", async () => {
      syncDraftView();
      const pendingNoteMessage = state.noteMessage.trim();
      const pendingPins = state.pins
        .map((pin, index) => ({ pin, index }))
        .filter((entry) => entry.pin.status === "draft" && entry.pin.message.trim());
      const pendingCapture = state.captureArea && state.captureMessage.trim()
        ? { message: state.captureMessage, captureArea: state.captureArea }
        : undefined;

      if (!pendingNoteMessage && pendingPins.length === 0 && !pendingCapture) {
        return;
      }

      state.sending = true;
      render();
      try {
        if (pendingNoteMessage) {
          const submitted = await submitFeedback({
            endpoint,
            projectKey: options.projectKey,
            type: "comment",
            message: pendingNoteMessage,
            appEnvironment
          });

          if (submitted.id) {
            const sentFeedback: StoredSentFeedback = {
              viewKey: state.viewKey,
              feedbackId: submitted.id,
              type: "comment",
              message: pendingNoteMessage,
              sentAt: new Date().toISOString()
            };
            state.sentFeedbacks = [sentFeedback, ...state.sentFeedbacks].slice(0, 120);
            persistSentFeedback(sentFeedbacksStorageKey, state.viewKey, sentFeedback);
          }

          state.noteMessage = "";
        }

        for (const { pin, index } of pendingPins) {
          const submitted = await submitFeedback({
            endpoint,
            projectKey: options.projectKey,
            type: "pin",
            message: pin.message,
            pins: [pin.target],
            appEnvironment
          });
          const sentAt = new Date().toISOString();
          state.pins[index] = {
            ...pin,
            status: "sent",
            feedbackId: submitted.id,
            sentAt
          };
          persistSentPin(sentPinsStorageKey, state.viewKey, state.pins[index]);
        }

        if (pendingCapture) {
          const submitted = await submitFeedback({
            endpoint,
            projectKey: options.projectKey,
            type: "screenshot",
            message: pendingCapture.message,
            captureArea: pendingCapture.captureArea,
            appEnvironment
          });

          if (submitted.id) {
            const sentFeedback: StoredSentFeedback = {
              viewKey: state.viewKey,
              feedbackId: submitted.id,
              type: "screenshot",
              message: pendingCapture.message,
              sentAt: new Date().toISOString(),
              captureArea: pendingCapture.captureArea,
              screenshotDataUrl: submitted.screenshotDataUrl
            };
            state.sentFeedbacks = [sentFeedback, ...state.sentFeedbacks].slice(0, 120);
            persistSentFeedback(sentFeedbacksStorageKey, state.viewKey, sentFeedback);
          }

          state.captureMessage = "";
          state.captureArea = undefined;
          state.draftViewKey = undefined;
        }

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

  window.addEventListener("scroll", () => {
    updatePinnedMarkers();
    updateFloatingOffset();
  }, { passive: true });
  window.addEventListener("resize", () => {
    updatePinnedMarkers();
    updateFloatingOffset();
  });
  installNavigationListener(() => {
    if (syncDraftView()) {
      render();
    }
  });

  render();
}

async function submitFeedback(params: {
  endpoint: string;
  projectKey: string;
  type: FeedbackType;
  message: string;
  pins?: PinTarget[];
  captureArea?: CaptureArea;
  appEnvironment?: FeedbackAppEnvironment;
}): Promise<{ id?: string; screenshotDataUrl?: string }> {
  const screenshotDataUrl = params.type === "screenshot" && params.captureArea
    ? await captureViewport(params.captureArea)
    : params.type === "pin"
      ? await captureViewport()
      : undefined;

  const payload: FeedbackPayload = {
    projectKey: params.projectKey,
    type: params.type,
    message: params.message,
    pin: params.pins?.[0],
    pins: params.pins?.length ? params.pins : undefined,
    captureArea: params.captureArea,
    screenshotDataUrl,
    metadata: {
      url: window.location.href,
      origin: httpOrigin(window.location.origin),
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
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        availableWidth: window.screen.availWidth,
        availableHeight: window.screen.availHeight,
        colorDepth: window.screen.colorDepth,
        pixelDepth: window.screen.pixelDepth
      },
      devicePixelRatio: window.devicePixelRatio,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      online: navigator.onLine,
      app: params.appEnvironment,
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

  const body = await response.json().catch(() => undefined) as unknown;
  return isRecord(body) && typeof body.id === "string" ? { id: body.id, screenshotDataUrl } : { screenshotDataUrl };
}

async function cancelFeedback(params: {
  endpoint: string;
  feedbackId: string;
  projectKey: string;
}): Promise<void> {
  const response = await fetch(publicFeedbackActionUrl(params.endpoint, `${params.feedbackId}/cancel`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ projectKey: params.projectKey })
  });

  if (!response.ok) {
    throw new Error(`Feedback cancel API returned ${response.status}`);
  }
}

function publicFeedbackActionUrl(endpoint: string, actionPath: string): string {
  const url = new URL(endpoint, window.location.href);
  const basePath = url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;
  url.pathname = `${basePath}${actionPath}`;
  return url.toString();
}

function startCaptureSelection(label: string, onSelect: (area: CaptureArea) => void, onCancel?: () => void): void {
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
  let isFinished = false;

  const finish = (callback?: () => void) => {
    if (isFinished) {
      return;
    }

    isFinished = true;
    document.removeEventListener("keydown", handleKeydown, true);
    layer.remove();
    callback?.();
  };

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

    if (width < 8 || height < 8) {
      finish(onCancel);
      return;
    }

    finish(() => onSelect({
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(width),
      height: Math.round(height)
    }));
  });

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key !== "Escape") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    finish(onCancel);
  };

  document.addEventListener("keydown", handleKeydown, true);
}

function startPinMode(onSelect: (pin: PinTarget) => void): void {
  const previousCursor = document.documentElement.style.cursor;
  document.documentElement.style.cursor = "crosshair";

  const cleanup = () => {
    document.documentElement.style.cursor = previousCursor;
    document.removeEventListener("click", handleClick, true);
    document.removeEventListener("keydown", handleKeydown, true);
  };

  const handleClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    cleanup();

    const target = event.target instanceof Element ? event.target : undefined;
    onSelect({
      x: event.clientX + window.scrollX,
      y: event.clientY + window.scrollY,
      selector: target ? buildSelector(target) : undefined,
      text: target?.textContent?.trim().slice(0, 120)
    });
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key !== "Escape") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    cleanup();
  };

  document.addEventListener("click", handleClick, true);
  document.addEventListener("keydown", handleKeydown, true);
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

function currentViewKey(): string {
  return `${window.location.origin}${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function footerAvoidanceOffset(): number {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>("footer, [role='contentinfo'], [data-changethis-footer]"));
  const viewportHeight = window.innerHeight;

  return candidates.reduce((offset, element) => {
    const rect = element.getBoundingClientRect();
    const isVisible = rect.width > 80 && rect.height > 32 && rect.bottom > 0 && rect.top < viewportHeight;
    if (!isVisible) {
      return offset;
    }

    const overlapsBottomZone = rect.top < viewportHeight - 8 && rect.bottom > viewportHeight - 120;
    if (!overlapsBottomZone) {
      return offset;
    }

    const requiredOffset = Math.min(320, Math.max(0, viewportHeight - rect.top + 12));
    return Math.max(offset, requiredOffset);
  }, 0);
}

function loadSentPinsForView(storageKey: string, viewKey: string): DraftPin[] {
  return readStoredSentPins(storageKey)
    .filter((pin) => pin.viewKey === viewKey)
    .sort((a, b) => a.number - b.number)
    .map((pin) => ({
      number: pin.number,
      feedbackId: pin.feedbackId,
      target: pin.target,
      message: pin.message,
      status: "sent",
      sentAt: pin.sentAt
    }));
}

function persistSentPin(storageKey: string, viewKey: string, pin: DraftPin): void {
  if (pin.status !== "sent" || !pin.feedbackId) {
    return;
  }

  const sentAt = pin.sentAt ?? new Date().toISOString();
  const nextPin: StoredSentPin = {
    viewKey,
    number: pin.number,
    feedbackId: pin.feedbackId,
    target: pin.target,
    message: pin.message,
    sentAt
  };
  const existing = readStoredSentPins(storageKey).filter((item) => {
    return item.viewKey !== viewKey || item.number !== pin.number;
  });

  writeStoredSentPins(storageKey, [...existing, nextPin].slice(-120));
}

function removeStoredSentPin(storageKey: string, viewKey: string, feedbackId: string): void {
  writeStoredSentPins(storageKey, readStoredSentPins(storageKey).filter((pin) => {
    return pin.viewKey !== viewKey || pin.feedbackId !== feedbackId;
  }));
}

function readStoredSentPins(storageKey: string): StoredSentPin[] {
  try {
    const raw = window.localStorage.getItem(storageKey);
    const value = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(value)) {
      return [];
    }

    return value.flatMap((item) => parseStoredSentPin(item));
  } catch {
    return [];
  }
}

function writeStoredSentPins(storageKey: string, pins: StoredSentPin[]): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(pins));
  } catch {
    // Ignore storage failures: sent pins remain visible for the current session.
  }
}

function parseStoredSentPin(value: unknown): StoredSentPin[] {
  if (!isRecord(value) || typeof value.viewKey !== "string" || typeof value.message !== "string" || typeof value.sentAt !== "string") {
    return [];
  }

  const number = typeof value.number === "number" && Number.isFinite(value.number) ? value.number : undefined;
  const feedbackId = typeof value.feedbackId === "string" ? value.feedbackId : undefined;
  if (!number || !feedbackId || !isRecord(value.target)) {
    return [];
  }

  const target = parsePinTarget(value.target);
  if (!target) {
    return [];
  }

  return [{
    viewKey: value.viewKey,
    number,
    feedbackId,
    target,
    message: value.message,
    sentAt: value.sentAt
  }];
}

function loadSentFeedbacksForView(storageKey: string, viewKey: string): StoredSentFeedback[] {
  return readStoredSentFeedbacks(storageKey)
    .filter((feedback) => feedback.viewKey === viewKey)
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
}

function persistSentFeedback(storageKey: string, viewKey: string, feedback: StoredSentFeedback): void {
  const existing = readStoredSentFeedbacks(storageKey).filter((item) => {
    return item.viewKey !== viewKey || item.feedbackId !== feedback.feedbackId;
  });

  writeStoredSentFeedbacks(storageKey, [feedback, ...existing].slice(0, 120));
}

function removeStoredSentFeedback(storageKey: string, viewKey: string, feedbackId: string): void {
  writeStoredSentFeedbacks(storageKey, readStoredSentFeedbacks(storageKey).filter((feedback) => {
    return feedback.viewKey !== viewKey || feedback.feedbackId !== feedbackId;
  }));
}

function readStoredSentFeedbacks(storageKey: string): StoredSentFeedback[] {
  try {
    const raw = window.localStorage.getItem(storageKey);
    const value = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(value)) {
      return [];
    }

    return value.flatMap((item) => parseStoredSentFeedback(item));
  } catch {
    return [];
  }
}

function writeStoredSentFeedbacks(storageKey: string, feedbacks: StoredSentFeedback[]): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(feedbacks));
  } catch {
    // Ignore storage failures: sent feedback remains visible for the current session.
  }
}

function parseStoredSentFeedback(value: unknown): StoredSentFeedback[] {
  if (!isRecord(value)
    || typeof value.viewKey !== "string"
    || typeof value.feedbackId !== "string"
    || typeof value.message !== "string"
    || typeof value.sentAt !== "string"
    || (value.type !== "comment" && value.type !== "screenshot")) {
    return [];
  }

  return [{
    viewKey: value.viewKey,
    feedbackId: value.feedbackId,
    type: value.type,
    message: value.message,
    sentAt: value.sentAt,
    captureArea: isRecord(value.captureArea) ? parseCaptureArea(value.captureArea) : undefined,
    screenshotDataUrl: isSafeImageDataUrl(value.screenshotDataUrl) ? value.screenshotDataUrl : undefined
  }];
}

function parsePinTarget(value: Record<string, unknown>): PinTarget | undefined {
  if (typeof value.x !== "number" || typeof value.y !== "number" || !Number.isFinite(value.x) || !Number.isFinite(value.y)) {
    return undefined;
  }

  return {
    x: value.x,
    y: value.y,
    selector: typeof value.selector === "string" ? value.selector : undefined,
    text: typeof value.text === "string" ? value.text : undefined
  };
}

function parseCaptureArea(value: Record<string, unknown>): CaptureArea | undefined {
  if (typeof value.x !== "number"
    || typeof value.y !== "number"
    || typeof value.width !== "number"
    || typeof value.height !== "number"
    || !Number.isFinite(value.x)
    || !Number.isFinite(value.y)
    || !Number.isFinite(value.width)
    || !Number.isFinite(value.height)) {
    return undefined;
  }

  return {
    x: value.x,
    y: value.y,
    width: value.width,
    height: value.height
  };
}

function nextAvailablePinNumber(pins: DraftPin[]): number {
  return Math.max(0, ...pins.map((pin) => pin.number)) + 1;
}

function installNavigationListener(onChange: () => void): void {
  let previousViewKey = currentViewKey();
  const notifyIfChanged = () => {
    window.queueMicrotask(() => {
      const nextViewKey = currentViewKey();
      if (nextViewKey === previousViewKey) {
        return;
      }

      previousViewKey = nextViewKey;
      onChange();
    });
  };

  const originalPushState = window.history.pushState.bind(window.history);
  window.history.pushState = (...args: Parameters<History["pushState"]>) => {
    const result = originalPushState(...args);
    notifyIfChanged();
    return result;
  };

  const originalReplaceState = window.history.replaceState.bind(window.history);
  window.history.replaceState = (...args: Parameters<History["replaceState"]>) => {
    const result = originalReplaceState(...args);
    notifyIfChanged();
    return result;
  };

  window.addEventListener("popstate", notifyIfChanged);
  window.addEventListener("hashchange", notifyIfChanged);
}

function feedbackMeta(
  state: { pins?: DraftPin[]; captureArea?: CaptureArea },
  fallback: string
): string {
  if (state.pins?.length) {
    return state.pins.length === 1
      ? `Pin #1: x=${Math.round(state.pins[0].target.x)}, y=${Math.round(state.pins[0].target.y)}`
      : `${state.pins.length} pins`;
  }

  if (state.captureArea) {
    return `Capture: ${Math.round(state.captureArea.width)}x${Math.round(state.captureArea.height)}`;
  }

  return escapeHtml(fallback);
}

function capturePreviewMarkup(feedback: StoredSentFeedback, label: string): string {
  if (!isSafeImageDataUrl(feedback.screenshotDataUrl)) {
    return "";
  }

  const safeDataUrl = escapeHtml(feedback.screenshotDataUrl);
  const safeLabel = escapeHtml(label);
  return `
    <a class="manager-capture-preview" href="${safeDataUrl}" target="_blank" rel="noopener noreferrer">
      <img src="${safeDataUrl}" alt="${safeLabel}" />
      <span>${safeLabel}</span>
    </a>
  `;
}

function isSafeImageDataUrl(value: unknown): value is string {
  return typeof value === "string" && /^data:image\/(?:png|jpeg|jpg|webp|svg\+xml);base64,/i.test(value);
}

function draftPinLabel(pin: DraftPin, index: number, missingText = "Texte manquant"): string {
  const message = pin.message.trim();
  if (message) {
    return message.length > 46 ? `${message.slice(0, 43)}...` : message;
  }

  return missingText || `Pin #${pin.number || index + 1}`;
}

function buildSelector(element: Element): string {
  if (element.id) {
    return `#${CSS.escape(element.id)}`;
  }

  const classes = Array.from(element.classList).slice(0, 3).map((className) => `.${CSS.escape(className)}`).join("");
  return `${element.tagName.toLowerCase()}${classes}`;
}

function buildAppEnvironment(options: WidgetOptions): FeedbackAppEnvironment | undefined {
  const appEnvironment: FeedbackAppEnvironment = {
    environment: safeDataValue(options.environment),
    release: safeDataValue(options.release),
    appVersion: safeDataValue(options.appVersion),
    buildId: safeDataValue(options.buildId),
    commitSha: safeDataValue(options.commitSha),
    branch: safeDataValue(options.branch),
    testRunId: safeDataValue(options.testRunId),
    scenario: safeDataValue(options.scenario),
    customer: safeDataValue(options.customer)
  };

  return appEnvironment.environment
    || appEnvironment.release
    || appEnvironment.appVersion
    || appEnvironment.buildId
    || appEnvironment.commitSha
    || appEnvironment.branch
    || appEnvironment.testRunId
    || appEnvironment.scenario
    || appEnvironment.customer
    ? appEnvironment
    : undefined;
}

function safeDataValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, 128) : undefined;
}

function httpOrigin(value: string): string | undefined {
  return value.startsWith("http://") || value.startsWith("https://") ? value : undefined;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const currentScript = document.currentScript as HTMLScriptElement | null;
const projectKey = currentScript?.dataset.project;

if (projectKey) {
  const variant = currentScript?.dataset.buttonVariant;
  const position = currentScript?.dataset.position;

  initChangeThis({
    projectKey,
    endpoint: currentScript?.dataset.endpoint,
    buttonLabel: currentScript?.dataset.buttonLabel,
    buttonStateLabel: currentScript?.dataset.buttonState,
    buttonVariant: variant === "dev" || variant === "prod" || variant === "review" || variant === "subtle" ? variant : undefined,
    buttonPosition: position === "bottom-right" || position === "bottom-left" || position === "top-right" || position === "top-left" ? position : undefined,
    locale: currentScript?.dataset.locale === "fr" || currentScript?.dataset.locale === "en" ? currentScript.dataset.locale : undefined,
    visible: currentScript?.dataset.visible !== "false",
    environment: currentScript?.dataset.environment,
    release: currentScript?.dataset.release,
    appVersion: currentScript?.dataset.appVersion,
    buildId: currentScript?.dataset.buildId,
    commitSha: currentScript?.dataset.commitSha,
    branch: currentScript?.dataset.branch,
    testRunId: currentScript?.dataset.testRunId,
    scenario: currentScript?.dataset.scenario,
    customer: currentScript?.dataset.customer
  });
}
