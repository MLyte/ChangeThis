import html2canvas from "html2canvas";
import type { CaptureArea, FeedbackAppEnvironment, FeedbackCaptureMetadata, FeedbackPayload, FeedbackReporter, FeedbackType, PinTarget, WidgetMode, WidgetReporterFields } from "@changethis/shared";
import { captureFeedbackScreenshot } from "./capture.js";
import { inferEndpoint, inferLocale } from "./inference.js";

const capturePage = html2canvas as unknown as typeof import("html2canvas").default;

type WidgetOptions = {
  projectKey: string;
  endpoint?: string;
  buttonLabel?: string;
  title?: string;
  modes?: WidgetMode[];
  buttonStateLabel?: string;
  buttonVariant?: "default" | "dev" | "prod" | "review" | "subtle";
  displayMode?: "standard" | "subtle" | "hidden" | "disabled";
  buttonPosition?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  reporterFields?: WidgetReporterFields;
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

type WidgetConfigResponse = {
  locale?: "fr" | "en";
  buttonPosition?: WidgetOptions["buttonPosition"];
  button_position?: WidgetOptions["buttonPosition"];
  buttonVariant?: WidgetOptions["buttonVariant"];
  button_variant?: WidgetOptions["buttonVariant"];
  reporterFields?: WidgetReporterFields;
  reporter_fields?: WidgetReporterFields;
  title?: string;
  modes?: WidgetMode[];
  endpoint?: string;
  displayMode?: WidgetOptions["displayMode"];
  display_mode?: WidgetOptions["displayMode"];
  visible?: boolean;
};

type DraftPin = {
  number: number;
  target: PinTarget;
  message: string;
  status: "draft" | "sent";
  feedbackId?: string;
  reporter?: FeedbackReporter;
  sentAt?: string;
};

type StoredSentPin = {
  viewKey: string;
  number: number;
  feedbackId: string;
  target: PinTarget;
  message: string;
  reporter?: FeedbackReporter;
  sentAt: string;
};

type StoredSentFeedback = {
  viewKey: string;
  feedbackId: string;
  type: Extract<FeedbackType, "comment" | "screenshot">;
  message: string;
  reporter?: FeedbackReporter;
  sentAt: string;
  captureArea?: CaptureArea;
  screenshotDataUrl?: string;
};

type CaptureDiagnostics = Omit<FeedbackCaptureMetadata, "risk" | "source">;

const rootId = "changethis-widget-root";
const sentPinsStorageKeyPrefix = "changethis:sentPins:";
const sentFeedbacksStorageKeyPrefix = "changethis:sentFeedbacks:";
const reporterStorageKeyPrefix = "changethis:reporter:";
const contactWebsiteUrl = "https://mathieuluyten.be";
const maxScreenshotDimension = 1600;
const pageFeedbackScreenshotMaxDimension = 960;
const maxThumbnailDimension = 400;
const maxManualCaptureUploadBytes = 2_000_000;
const manualCaptureUploadTypes = ["image/png", "image/jpeg", "image/webp"];
const screenshotQuality = 0.8;
const pageFeedbackScreenshotQuality = 0.62;
const thumbnailQuality = 0.74;
const capturePreparationTimeoutMs = 1200;
const defaultWidgetModes: WidgetMode[] = ["comment", "pin", "screenshot"];
const maxWidgetTitleLength = 240;
const widgetConfigStartupTimeoutMs = 700;
let lastCaptureDiagnostics: CaptureDiagnostics | undefined;
const changethisHandLogoSvg = '<svg class="brand-logo-icon" aria-hidden="true" viewBox="14 1 17 23" role="img"><g transform="rotate(180 22.5 12)"><path d="M19 1h2v1h1v4h2v1h3v1h2v1h1v1h1v7h-1v3h-1v3H19v-3h-1v-2h-1v-2h-1v-2h-1v-1h-1v-3h3v1h1V2h1"/><path fill="#fff" d="M21 2v9h1V7h2v4h1V8h2v4h1V9h1v1h1v7h-1v3h-1v2h-8v-2h-1v-2h-1v-2h-1v-2h-1v-1h-1v-2h2v1h1v1h1V2"/></g></svg>';
const lucideIcons = {
  bug: '<svg class="lucide-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3 3 0 0 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6 13H2"/><path d="M22 13h-4"/><path d="M6 17H3"/><path d="M21 17h-3"/></svg>',
  camera: '<svg class="lucide-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z"/><circle cx="12" cy="13" r="3"/></svg>',
  check: '<svg class="lucide-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>',
  "clipboard-paste": '<svg class="lucide-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M11 14h10"/><path d="m17 10 4 4-4 4"/><path d="M16 4h2a2 2 0 0 1 2 2v1"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8"/><rect width="8" height="4" x="8" y="2" rx="1"/></svg>',
  mail: '<svg class="lucide-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"/><rect x="2" y="4" width="20" height="16" rx="2"/></svg>',
  "map-pin": '<svg class="lucide-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>',
  "message-square": '<svg class="lucide-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  pencil: '<svg class="lucide-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  plus: '<svg class="lucide-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
  question: '<svg class="lucide-icon" aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>',
  scan: '<svg class="lucide-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/></svg>',
  send: '<svg class="lucide-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>',
  trash: '<svg class="lucide-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  undo: '<svg class="lucide-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 1 1 0 11H11"/></svg>',
  upload: '<svg class="lucide-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M12 3v12"/><path d="m17 8-5-5-5 5"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/></svg>',
  x: '<svg class="lucide-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>'
};
const widgetCopy = {
  fr: {
    button: "Commenter",
    brandLabel: "Aide",
    helpTitle: "Comment utiliser ce widget",
    helpIntro: "Ce widget sert à signaler simplement ce qui doit être amélioré sur cette page.",
    helpStepComment: "Utilise Commentaire pour laisser un retour général.",
    helpStepPin: "Utilise Pin pour pointer précisément un élément à corriger.",
    helpStepCapture: "Utilise Capture pour encadrer une zone visible de l'écran.",
    helpCustomTitle: "Consigne du site",
    contactLabel: "Contact",
    title: "Que faut-il changer ?",
    note: "Commentaire",
    pin: "Pin",
    screenshot: "Capture",
    placeholder: "Décris le retour global sur cette page",
    capturePlaceholder: "Décris ce qu'il faut corriger dans cette capture",
    metaDefault: "",
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
    captureVisibleViewport: "Capturer l’écran visible",
    uploadCapture: "Joindre une image",
    pasteCapture: "Depuis le presse-papier",
    removeUploadCapture: "Retirer l'image",
    uploadCaptureInvalid: "Image invalide ou trop lourde.",
    addPin: "Ajouter une pin",
    selectPin: "Touchez la zone à commenter",
    pins: "Pins",
    showPins: "Afficher toutes les pins",
    hidePins: "Masquer toutes les pins",
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
    removeFeedback: "Retirer le feedback",
    updateReporterCount: "Mettre à jour le contact ({count})",
    noSentFeedback: "Aucun feedback envoyé sur cette page.",
    noDraftFeedback: "Aucun feedback en brouillon sur cette page.",
    canceled: "Feedback annulé.",
    sent: "Feedback envoyé. Merci.",
    alertError: "Impossible d'envoyer le feedback. Réessaie dans un instant.",
    reporterTitle: "Mes infos",
    reporterOptional: "Optionnel, mais utile pour vous recontacter.",
    reporterRequired: "Requis pour envoyer ce feedback.",
    reporterToggle: "Mes infos",
    reporterName: "Nom",
    reporterEmail: "E-mail",
    reporterEmailInvalid: "E-mail invalide.",
    reporterSave: "Sauvegarder"
  },
  en: {
    button: "Feedback",
    brandLabel: "Help",
    helpTitle: "How to use this widget",
    helpIntro: "This widget helps you report what should be improved on this page.",
    helpStepComment: "Use Page review to leave a general comment.",
    helpStepPin: "Use Pin to point at a specific element to fix.",
    helpStepCapture: "Use Screenshot to frame a visible area of the screen.",
    helpCustomTitle: "Site guidance",
    contactLabel: "Contact",
    title: "What should change?",
    note: "Page review",
    pin: "Pin",
    screenshot: "Screenshot",
    placeholder: "Describe the page-level feedback here",
    capturePlaceholder: "Describe what should change in this capture",
    metaDefault: "",
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
    captureVisibleViewport: "Capture visible screen",
    uploadCapture: "Attach image",
    pasteCapture: "From clipboard",
    removeUploadCapture: "Remove image",
    uploadCaptureInvalid: "Invalid or oversized image.",
    addPin: "Add pin",
    selectPin: "Tap the area to comment on",
    pins: "Pins",
    showPins: "Show all pins",
    hidePins: "Hide all pins",
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
    removeFeedback: "Remove feedback",
    updateReporterCount: "Update contact ({count})",
    noSentFeedback: "No feedback sent on this page.",
    noDraftFeedback: "No draft feedback on this page.",
    canceled: "Feedback canceled.",
    sent: "Feedback sent. Thank you.",
    alertError: "Unable to send feedback. Try again in a moment.",
    reporterTitle: "Your details",
    reporterOptional: "Optional, but useful if we need to follow up.",
    reporterRequired: "Required to send this feedback.",
    reporterToggle: "Contact",
    reporterName: "Name",
    reporterEmail: "Email",
    reporterEmailInvalid: "Invalid email.",
    reporterSave: "Save"
  }
};

export function initChangeThis(options: WidgetOptions): void {
  if (!options.projectKey || options.visible === false || options.displayMode === "disabled" || document.getElementById(rootId)) {
    return;
  }

  const endpoint = options.endpoint ?? inferEndpoint();
  const baseCopy = widgetCopy[options.locale ?? inferLocale()];
  const copy = {
    ...baseCopy,
    title: normalizeWidgetTitle(options.title, baseCopy.title) ?? baseCopy.title
  };
  const buttonLabel = options.buttonLabel ?? copy.button;
  const buttonStateLabel = options.buttonStateLabel;
  const displayMode = options.displayMode ?? displayModeFromButtonVariant(options.buttonVariant);
  const buttonVariant = displayMode === "subtle" ? "subtle" : options.buttonVariant ?? "default";
  const buttonPosition = options.buttonPosition ?? "bottom-right";
  const isSubtleButton = buttonVariant === "subtle";
  const isHiddenDisplayMode = displayMode === "hidden";
  const configuredModes = normalizeWidgetModes(options.modes);
  const advancedModesEnabled = true;
  const enabledModes = configuredModes.filter((mode) => mode === "comment" || advancedModesEnabled);
  const activeModes: WidgetMode[] = enabledModes.length > 0 ? enabledModes : ["comment"];
  const firstMode: WidgetMode = activeModes[0] ?? "comment";
  const reporterFields = options.reporterFields ?? "optional";
  const appEnvironment = buildAppEnvironment(options);
  const sentPinsStorageKey = `${sentPinsStorageKeyPrefix}${options.projectKey}`;
  const sentFeedbacksStorageKey = `${sentFeedbacksStorageKeyPrefix}${options.projectKey}`;
  const reporterStorageKey = `${reporterStorageKeyPrefix}${options.projectKey}`;
  const storedReporter = readStoredReporter(reporterStorageKey);
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
    type: firstMode as FeedbackType,
    viewKey: currentViewKey(),
    pins: currentPins,
    sentFeedbacks: currentSentFeedbacks,
    nextPinNumber: nextAvailablePinNumber(currentPins),
    draftViewKey: undefined as string | undefined,
    captureArea: undefined as CaptureArea | undefined,
    sending: false,
    noteMessage: "",
    captureMessage: "",
    captureUploadDataUrl: undefined as string | undefined,
    captureUploadName: undefined as string | undefined,
    reporterName: storedReporter.name ?? "",
    reporterEmail: storedReporter.email ?? "",
    reporterOpen: reporterFields === "required" && (!storedReporter.name || !storedReporter.email),
    helpOpen: false,
    managerOpen: false,
    notice: "",
    focusPinIndex: undefined as number | undefined,
    pinsVisible: true
  };

  const clearViewBoundDraft = () => {
    state.pins = loadSentPinsForView(sentPinsStorageKey, currentViewKey());
    state.sentFeedbacks = loadSentFeedbacksForView(sentFeedbacksStorageKey, currentViewKey());
    state.nextPinNumber = nextAvailablePinNumber(state.pins);
    state.captureArea = undefined;
    state.captureMessage = "";
    state.captureUploadDataUrl = undefined;
    state.captureUploadName = undefined;
    state.draftViewKey = undefined;
    if (!isModeEnabled(state.type, activeModes)) {
      state.type = firstMode as FeedbackType;
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
    if (!isModeEnabled("pin", activeModes) || !advancedModesEnabled) {
      state.type = firstMode as FeedbackType;
      render();
      return;
    }

    syncDraftView();
    const viewKey = currentViewKey();
    state.type = "pin";
    state.draftViewKey = viewKey;
    state.captureArea = undefined;
    state.notice = "";
    state.open = false;
    render();
    startPinMode(copy.selectPin, copy.close, (pin) => {
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
    }, () => {
      state.type = "pin";
      state.open = true;
      render();
    });
  };

  const requestCaptureArea = () => {
    if (!isModeEnabled("screenshot", activeModes) || !advancedModesEnabled) {
      state.type = firstMode as FeedbackType;
      render();
      return;
    }

    syncDraftView();
    const viewKey = currentViewKey();
    state.type = "screenshot";
    state.draftViewKey = viewKey;

    if (prefersViewportCapture()) {
      state.captureArea = currentViewportCaptureArea();
      state.open = true;
      render();
      return;
    }

    state.open = false;
    render();
    startCaptureSelection(copy.selectArea, copy.close, (area) => {
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
    if (!isModeEnabled(state.type, activeModes)) {
      state.type = firstMode as FeedbackType;
    }
    const pinMarkers = state.pinsVisible ? state.pins.map((pin, index) => {
      const position = pinViewportPosition(pin.target);
      return `<div class="pin" data-pin-index="${index}" data-status="${pin.status}" style="left:${position.x}px;top:${position.y}px">${pin.number}</div>`;
    }).join("") : "";
    const isPinTab = state.type === "pin";
    const isCaptureTab = state.type === "screenshot";
    const hasPins = isPinTab && state.pins.length > 0;
    const captureActionLabel = prefersViewportCapture() ? copy.captureVisibleViewport : copy.defineCapture;
    const canPasteCapture = typeof (navigator.clipboard as { read?: unknown } | undefined)?.read === "function";
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
    const draftCaptures = state.captureMessage.trim() || state.captureArea || state.captureUploadDataUrl ? [{
      id: "capture-draft",
      title: copy.screenshot,
      message: state.captureMessage || state.captureUploadName || feedbackMeta({ captureArea: state.captureArea }, copy.metaDefault),
      status: "draft" as const
    }] : [];
    const sentCaptures = state.sentFeedbacks.filter((feedback) => feedback.type === "screenshot");
    const totalDraftFeedbacks = draftNotes.length + draftPins.length + draftCaptures.length;
    const totalSentFeedbacks = sentNotes.length + sentPins.length + sentCaptures.length;
    const totalFeedbacks = totalDraftFeedbacks + totalSentFeedbacks;
    const getReadyDraftFeedbackCount = () => (state.noteMessage.trim() ? 1 : 0)
      + state.pins.filter((pin) => pin.status === "draft" && pin.message.trim()).length
      + ((state.captureArea || state.captureUploadDataUrl) && state.captureMessage.trim() ? 1 : 0);
    const readyDraftFeedbackCount = getReadyDraftFeedbackCount();
    const reporter = currentReporter(state.reporterName, state.reporterEmail);
    const reporterEmailInvalid = Boolean(state.reporterEmail.trim()) && !isValidEmail(state.reporterEmail.trim());
    const reporterReady = reporterFields !== "required" || Boolean(reporter?.name && reporter.email && !reporterEmailInvalid);
    const reporterUpdateCandidates = reporter && !reporterEmailInvalid
      ? [
          ...state.sentFeedbacks
            .filter((feedback) => !sameReporter(feedback.reporter, reporter))
            .map((feedback) => feedback.feedbackId),
          ...sentPins
            .filter((pin) => pin.feedbackId && !sameReporter(pin.reporter, reporter))
            .map((pin) => pin.feedbackId as string)
        ]
      : [];
    const reporterUpdateIds = [...new Set(reporterUpdateCandidates)];
    const canSend = !state.sending && readyDraftFeedbackCount > 0 && reporterReady && !reporterEmailInvalid;
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
          box-shadow: 0 12px 30px #11182738;
        }
        .button[data-position="bottom-right"] { right: 20px; bottom: calc(20px + var(--ct-footer-offset, 0px)); }
        .button[data-position="bottom-left"] { left: 20px; bottom: calc(20px + var(--ct-footer-offset, 0px)); }
        .button[data-position="top-right"] { right: 20px; top: 20px; }
        .button[data-position="top-left"] { left: 20px; top: 20px; }
        .button[data-variant="default"][aria-expanded="false"] {
          animation: changethis-standard-button-pulse 3.8s ease-out infinite;
        }
        .button[data-variant="dev"] { background: #1d4ed8; }
        .button[data-variant="prod"] { background: #0f766e; }
        .button[data-variant="review"] { background: #7c2d12; }
        @keyframes changethis-standard-button-pulse {
          0%, 70%, 100% {
            box-shadow:
              0 12px 30px #11182738,
              0 0 0 0 #3f51b538;
          }
          24% {
            box-shadow:
              0 12px 30px #11182738,
              0 0 0 12px #3f51b500;
          }
        }
        .button .brand-logo-icon {
          display: block;
          flex: 0 0 auto;
          height: 1.25em;
          width: 1.25em;
        }
        .button[data-variant="subtle"] {
          background: rgba(17, 24, 39, 0.72);
          border: 1px solid rgba(255, 255, 255, 0.44);
          color: #fff;
          height: 42px;
          justify-content: center;
          opacity: 0.46;
          padding: 0;
          width: 42px;
        }
        .button[data-variant="subtle"] .lucide-icon {
          height: 18px;
          width: 18px;
        }
        .button[data-variant="subtle"] .brand-logo-icon {
          height: 28px;
          width: 28px;
        }
        .button[data-variant="subtle"]:hover,
        .button[data-variant="subtle"]:focus-visible,
        .button[data-variant="subtle"][aria-expanded="true"] {
          opacity: 1;
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
          box-sizing: border-box;
          width: min(400px, calc(100vw - 24px));
          max-height: min(760px, calc(100dvh - 88px - env(safe-area-inset-bottom)));
          border: 1px solid #c5cae9;
          border-top: 3px solid #3f51b5;
          border-radius: 8px;
          background: #fff;
          color: #111827;
          box-shadow: 0 20px 50px rgba(17, 24, 39, 0.18);
          display: grid;
          gap: 12px;
          overflow-x: hidden;
          overflow-y: auto;
          overscroll-behavior: contain;
          padding: 14px;
        }
        .panel * {
          box-sizing: border-box;
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
        }
        .panel-brand {
          align-items: center;
          display: inline-flex;
          gap: 6px;
          min-width: 0;
        }
        .panel-brand .brand-logo-icon {
          color: #111827;
          display: block;
          flex: 0 0 auto;
          height: 18px;
          width: 18px;
        }
        .panel-brand strong {
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0;
          line-height: 1;
        }
        .panel-brand .brand-change {
          color: #111827;
        }
        .panel-brand .brand-this {
          color: #3f51b5;
        }
        .panel-header-actions {
          align-items: center;
          display: inline-flex;
          flex: 0 0 auto;
          gap: 8px;
        }
        .header-icon-button,
        .help-trigger,
        .panel-link {
          align-items: center;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: #fff;
          color: #4b5563;
          cursor: pointer;
          display: inline-flex;
          flex: 0 0 auto;
          gap: 6px;
          height: 32px;
          justify-content: center;
          min-width: 32px;
          padding: 0 8px;
          text-decoration: none;
        }
        .header-icon-button {
          font-size: 12px;
          font-weight: 900;
        }
        .panel-link {
          font-size: 12px;
          font-weight: 900;
        }
        .help-trigger:hover,
        .help-trigger:focus-visible,
        .header-icon-button:hover,
        .header-icon-button:focus-visible,
        .panel-link:hover,
        .panel-link:focus-visible {
          background: #f9fafb;
          border-color: #c5cae9;
          color: #3f51b5;
        }
        .title { font-size: 14px; font-weight: 800; margin: 0; }
        .title strong { font-weight: 900; }
        .title em { font-style: italic; }
        .help-backdrop {
          background: rgba(17, 24, 39, 0.34);
          border: 0;
          inset: 0;
          padding: 0;
          position: fixed;
          z-index: 2147483647;
        }
        .help-modal {
          background: #fff;
          border: 1px solid #c5cae9;
          border-radius: 8px;
          box-shadow: 0 24px 70px rgba(17, 24, 39, 0.25);
          color: #111827;
          display: grid;
          gap: 14px;
          left: 50%;
          max-height: min(560px, calc(100dvh - 48px));
          overflow: auto;
          padding: 18px;
          position: fixed;
          top: 50%;
          transform: translate(-50%, -50%);
          width: min(360px, calc(100vw - 28px));
          z-index: 2147483647;
        }
        .help-header {
          align-items: start;
          display: flex;
          gap: 12px;
          justify-content: space-between;
        }
        .help-header h2 {
          color: #111827;
          font-size: 16px;
          line-height: 1.25;
          margin: 0;
        }
        .help-header p {
          color: #4b5563;
          font-size: 13px;
          line-height: 1.45;
          margin: 5px 0 0;
        }
        .help-list {
          display: grid;
          gap: 8px;
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .help-list li {
          align-items: start;
          color: #374151;
          display: grid;
          font-size: 13px;
          gap: 8px;
          grid-template-columns: 22px 1fr;
          line-height: 1.4;
        }
        .help-list svg {
          color: #3f51b5;
          height: 16px;
          margin-top: 1px;
          width: 16px;
        }
        .help-guidance {
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          display: grid;
          gap: 7px;
          padding: 12px;
        }
        .help-guidance strong {
          color: #111827;
          font-size: 12px;
          font-weight: 900;
          line-height: 1.2;
        }
        .help-markdown {
          color: #374151;
          display: grid;
          gap: 7px;
          font-size: 13px;
          line-height: 1.45;
        }
        .help-markdown p,
        .help-markdown ul {
          margin: 0;
        }
        .help-markdown ul {
          display: grid;
          gap: 4px;
          padding-left: 18px;
        }
        .help-markdown code {
          background: #eef2ff;
          border-radius: 4px;
          color: #3730a3;
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 0.92em;
          padding: 1px 4px;
        }
        .help-contact {
          align-items: center;
          border: 1px solid #e5e7eb;
          border-radius: 999px;
          color: #4b5563;
          display: inline-flex;
          font-size: 12px;
          font-weight: 900;
          justify-self: start;
          min-height: 30px;
          padding: 6px 11px;
          text-decoration: none;
        }
        .help-contact:hover,
        .help-contact:focus-visible {
          border-color: #c5cae9;
          color: #3f51b5;
        }
        .modes {
          border-bottom: 1px solid #e5e7eb;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0;
        }
        .modes[data-advanced="false"] {
          grid-template-columns: 1fr;
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
          min-width: 0;
          overflow: hidden;
          padding: 8px 6px 10px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .mode:hover {
          background: #f9fafb;
          color: #111827;
        }
        .mode[data-active="true"] {
          border-bottom-color: #3f51b5;
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
        .reporter-fields {
          border: 1px solid #c5cae9;
          border-radius: 7px;
          background: #f8f9ff;
          display: grid;
          gap: 8px;
          padding: 8px;
        }
        .reporter-trigger strong {
          color: inherit;
          font-size: 12px;
          font-weight: 900;
        }
        .field-error {
          color: #6b7280;
          font-size: 11px;
          font-weight: 750;
          line-height: 1.3;
        }
        .reporter-body {
          display: grid;
          gap: 8px;
        }
        .field-error {
          color: #b91c1c;
        }
        .reporter-grid {
          display: grid;
          gap: 8px;
          grid-template-columns: 1fr 1fr;
        }
        .reporter-field {
          display: grid;
          gap: 4px;
          min-width: 0;
        }
        .reporter-field span {
          color: #374151;
          font-size: 11px;
          font-weight: 850;
        }
        .reporter-field input {
          border: 1px solid #d1d5db;
          border-radius: 6px;
          color: #111827;
          font-size: 13px;
          font-weight: 700;
          min-height: 34px;
          min-width: 0;
          padding: 8px 9px;
          width: 100%;
        }
        .meta {
          color: #6b7280;
          font-size: 12px;
          line-height: 1.4;
          margin: 4px 0 0;
        }
        .shortcut-hint {
          color: #6b7280;
          font-size: 11px;
          font-weight: 750;
          line-height: 1.3;
          margin: 4px 0 0;
        }
        .selection-summary {
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          margin-top: 8px;
          padding: 8px 10px;
        }
        .capture-summary {
          border: 0;
          display: grid;
          gap: 4px;
          margin-top: 0;
          padding: 0;
        }
        .selection-header {
          display: grid;
          gap: 8px;
          margin-bottom: 6px;
        }
        .pin-meta-row {
          align-items: center;
          display: flex;
          gap: 8px;
          justify-content: space-between;
          min-width: 0;
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
        .capture-actions {
          display: grid;
          gap: 8px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .capture-main {
          grid-column: 1 / -1;
        }
        .capture-actions .add-pin {
          width: 100%;
        }
        .capture-upload-row {
          align-items: center;
          display: grid;
          gap: 6px;
          grid-template-columns: minmax(0, 1fr) auto;
        }
        .capture-upload-row .shortcut-hint {
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
          max-width: 100%;
          min-height: 28px;
          padding: 5px 8px;
          white-space: normal;
        }
        .pin-visibility-toggle {
          border: 0;
          background: transparent;
          color: #6b7280;
          cursor: pointer;
          font-size: 11px;
          font-weight: 750;
          padding: 4px 0;
          text-align: right;
          text-decoration: underline;
          text-underline-offset: 3px;
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
        .manager-button.primary {
          border: 1px solid #3f51b5;
          background: #3f51b5;
          color: #fff;
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
        .reporter-actions {
          justify-content: flex-end;
        }
        .manager-button:disabled {
          cursor: wait;
          opacity: .65;
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
        .reporter-modal {
          width: min(440px, calc(100vw - 32px));
        }
        .reporter-modal .reporter-fields {
          background: transparent;
          border: 0;
          padding: 0;
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
        .actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }
        .actions .send {
          min-width: 0;
          white-space: normal;
        }
        .send { background: #3f51b5; border-color: #3f51b5; color: #fff; }
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
        .notice[data-position="bottom-right"] { right: 20px; bottom: calc(76px + var(--ct-footer-offset, 0px)); }
        .notice[data-position="bottom-left"] { left: 20px; bottom: calc(76px + var(--ct-footer-offset, 0px)); }
        .notice[data-position="top-right"] { right: 20px; top: 76px; }
        .notice[data-position="top-left"] { left: 20px; top: 76px; }
        @media (max-width: 640px) {
          .panel {
            left: 8px !important;
            right: 8px !important;
            width: auto;
            max-height: min(720px, calc(100dvh - 68px - env(safe-area-inset-bottom) - var(--ct-footer-offset, 0px)));
            gap: 8px;
            overflow-x: hidden;
            padding: 10px;
          }
          .panel[data-position^="bottom"] {
            bottom: calc(58px + env(safe-area-inset-bottom) + var(--ct-footer-offset, 0px));
          }
          .panel[data-position^="top"] {
            top: calc(12px + env(safe-area-inset-top));
          }
          .notice[data-position^="bottom"] {
            bottom: calc(58px + env(safe-area-inset-bottom) + var(--ct-footer-offset, 0px));
          }
          .notice[data-position^="top"] {
            top: calc(12px + env(safe-area-inset-top));
          }
          .panel-header {
            align-items: center;
            gap: 6px;
          }
          .panel-brand strong,
          .title {
            font-size: 12px;
          }
          .panel-header-actions {
            flex-wrap: wrap;
            justify-content: flex-end;
          }
          .header-icon-button,
          .help-trigger {
            height: 30px;
            min-width: 30px;
            padding-inline: 7px;
          }
          .modes {
            margin-top: -2px;
          }
          .mode {
            font-size: 11px;
            gap: 4px;
            min-height: 32px;
            padding: 5px 4px 7px;
          }
          textarea {
            font-size: 13px;
            line-height: 1.3;
            min-height: 62px;
            padding: 8px;
          }
          .shortcut-hint {
            display: none;
          }
          .meta {
            font-size: 11px;
            margin-top: 3px;
            padding: 0;
          }
          .selection-summary {
            font-size: 11px;
            margin-top: 6px;
            padding: 7px 8px;
          }
          .selection-header {
            gap: 6px;
            margin-bottom: 4px;
          }
          .selection-header span {
            white-space: normal;
          }
          .actions {
            display: grid;
            gap: 7px;
            grid-template-columns: minmax(74px, max-content) minmax(0, 1fr);
          }
          .send,
          .cancel {
            font-size: 11px;
            min-height: 34px;
            padding: 7px 9px;
            width: 100%;
          }
          .manager-modal {
            width: calc(100vw - 24px);
            max-height: calc(100dvh - 24px);
            padding: 14px;
          }
          .manager-header {
            flex-direction: column;
          }
          .manager-stats,
          .manager-item,
          .reporter-grid {
            grid-template-columns: 1fr;
          }
          .manager-actions {
            justify-content: flex-start;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .button[data-variant="default"][aria-expanded="false"] {
            animation: none;
          }
        }
      </style>
      ${pinMarkers}
      ${state.notice ? `<div class="notice" data-position="${buttonPosition}" role="status">${escapeHtml(state.notice)}</div>` : ""}
      ${isHiddenDisplayMode ? "" : `<button class="button" data-action="toggle" data-position="${buttonPosition}" data-variant="${buttonVariant}" aria-expanded="${state.open}" aria-label="${escapeHtml(buttonLabel)}" title="${escapeHtml(buttonLabel)}">
        ${changethisHandLogoSvg}
        ${isSubtleButton ? "" : `<span>${escapeHtml(buttonLabel)}</span>`}
        ${buttonStateLabel && !isSubtleButton ? `<span class="button-state">${escapeHtml(buttonStateLabel)}</span>` : ""}
      </button>`}
      ${state.open ? `
        <section class="panel" data-position="${buttonPosition}" aria-label="Envoyer un feedback">
          <div class="panel-header">
            <div class="panel-brand" aria-label="ChangeThis">
              ${changethisHandLogoSvg}
              <strong><span class="brand-change">Change</span><span class="brand-this">This</span></strong>
            </div>
            <div class="panel-header-actions">
              ${reporterFields !== "hidden" ? `
                <button class="header-icon-button reporter-trigger" data-action="toggle-reporter" data-active="${state.reporterOpen}" aria-expanded="${state.reporterOpen}">
                  <strong>${escapeHtml(copy.reporterToggle)}</strong>
                </button>
              ` : ""}
              ${totalFeedbacks ? `<button class="panel-link" data-action="open-manager">${escapeHtml(copy.manageFeedbacks)}</button>` : ""}
              <button class="help-trigger" data-action="open-help" aria-label="${escapeHtml(copy.brandLabel)}" title="${escapeHtml(copy.brandLabel)}">${lucideIcons.question}</button>
            </div>
          </div>
          <p class="title">${renderInlineMarkdown(copy.title)}</p>
          <div class="modes" data-advanced="${advancedModesEnabled}">
            ${activeModes.includes("comment") ? `<button class="mode" data-mode="comment" data-active="${state.type === "comment"}">${lucideIcons["message-square"]}${escapeHtml(copy.note)}</button>` : ""}
            ${activeModes.includes("pin") ? `<button class="mode" data-mode="pin" data-active="${state.type === "pin"}">${lucideIcons["map-pin"]}${escapeHtml(copy.pin)}</button>` : ""}
            ${activeModes.includes("screenshot") ? `<button class="mode" data-mode="screenshot" data-active="${state.type === "screenshot"}">${lucideIcons.camera}${escapeHtml(copy.screenshot)}</button>` : ""}
          </div>
          ${state.type === "comment" ? `
            <textarea data-note-message placeholder="${escapeHtml(copy.placeholder)}">${escapeHtml(state.noteMessage)}</textarea>
            <p class="shortcut-hint">${escapeHtml(copy.shortcutHintAll)}</p>
          ` : ""}
          ${isPinTab ? `
            <div class="selection-summary">
              <div class="selection-header">
                <button class="add-pin" data-action="add-pin">${lucideIcons.plus}${escapeHtml(copy.addPin)}</button>
                <div class="pin-meta-row">
                  <span>${escapeHtml(copy.pins)} (${state.pins.length})</span>
                  ${state.pins.length
                    ? `<button class="pin-visibility-toggle" data-action="toggle-pins" aria-pressed="${!state.pinsVisible}" type="button">${escapeHtml(state.pinsVisible ? copy.hidePins : copy.showPins)}</button>`
                    : ""}
                </div>
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
              </ul>` : ""}
            </div>
          ` : ""}
          ${isCaptureTab ? `
            <div class="selection-summary capture-summary">
              <div class="capture-actions">
                <button class="add-pin capture-main" data-action="define-capture">${lucideIcons.scan}${escapeHtml(captureActionLabel)}</button>
                <label class="add-pin">
                  ${lucideIcons.upload}
                  ${escapeHtml(copy.uploadCapture)}
                  <input accept="image/png,image/jpeg,image/webp" data-capture-upload style="display:none" type="file">
                </label>
                ${canPasteCapture ? `<button class="add-pin" data-action="paste-capture">${lucideIcons["clipboard-paste"]}${escapeHtml(copy.pasteCapture)}</button>` : ""}
              </div>
              ${state.captureArea ? `<p class="shortcut-hint">${escapeHtml(feedbackMeta({ captureArea: state.captureArea }, copy.metaDefault))}</p>` : ""}
              ${state.captureUploadName ? `
                <div class="capture-upload-row">
                  <p class="shortcut-hint">${escapeHtml(state.captureUploadName)}</p>
                  ${state.captureUploadDataUrl ? `<button class="clear-selection" data-action="remove-capture-upload" aria-label="${escapeHtml(copy.removeUploadCapture)}" title="${escapeHtml(copy.removeUploadCapture)}">${lucideIcons.trash}</button>` : ""}
                </div>
              ` : ""}
            </div>
            <textarea data-capture-message placeholder="${escapeHtml(copy.capturePlaceholder)}">${escapeHtml(state.captureMessage)}</textarea>
            <p class="shortcut-hint">${escapeHtml(copy.shortcutHintAll)}</p>
          ` : ""}
          <div class="actions">
            <button class="cancel" data-action="close">${escapeHtml(copy.close)}</button>
            <button class="send" data-action="send" aria-label="${escapeHtml(copy.sendAllPending)}" title="${escapeHtml(copy.sendAllPending)}" ${canSend ? "" : "disabled"}>${lucideIcons.send}${escapeHtml(sendLabel)}</button>
          </div>
        </section>
      ` : ""}
      ${state.helpOpen ? `
        <button class="help-backdrop" data-action="close-help" aria-label="${escapeHtml(copy.close)}"></button>
        <section class="help-modal" aria-labelledby="changethis-help-title" role="dialog" aria-modal="true">
          <div class="help-header">
            <div>
              <h2 id="changethis-help-title">${escapeHtml(copy.helpTitle)}</h2>
              <p>${escapeHtml(copy.helpIntro)}</p>
            </div>
            <button class="header-icon-button" data-action="close-help" aria-label="${escapeHtml(copy.close)}">${lucideIcons.x}</button>
          </div>
          <ul class="help-list">
            ${activeModes.includes("comment") ? `<li>${lucideIcons["message-square"]}<span>${escapeHtml(copy.helpStepComment)}</span></li>` : ""}
            ${activeModes.includes("pin") ? `<li>${lucideIcons["map-pin"]}<span>${escapeHtml(copy.helpStepPin)}</span></li>` : ""}
            ${activeModes.includes("screenshot") ? `<li>${lucideIcons.camera}<span>${escapeHtml(copy.helpStepCapture)}</span></li>` : ""}
          </ul>
          <div class="help-guidance">
            <strong>${escapeHtml(copy.helpCustomTitle)}</strong>
            <div class="help-markdown">${renderWidgetMarkdown(copy.title)}</div>
          </div>
          <a class="help-contact" href="${contactWebsiteUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(copy.contactLabel)}</a>
        </section>
      ` : ""}
      ${state.open && reporterFields !== "hidden" && state.reporterOpen ? `
        <button class="manager-backdrop" data-action="close-reporter" aria-label="${escapeHtml(copy.close)}"></button>
        <section class="manager-modal reporter-modal" aria-labelledby="changethis-reporter-title" role="dialog" aria-modal="true">
          <div class="manager-header">
            <div>
              <h2 id="changethis-reporter-title">${escapeHtml(copy.reporterTitle)}</h2>
              <p>${escapeHtml(reporterFields === "required" ? copy.reporterRequired : copy.reporterOptional)}</p>
            </div>
            <div class="manager-actions">
              <button class="manager-button secondary icon-only" data-action="close-reporter" aria-label="${escapeHtml(copy.close)}" title="${escapeHtml(copy.close)}">${lucideIcons.x}</button>
            </div>
          </div>
          <div class="reporter-fields">
            <div class="reporter-body">
              <div class="reporter-grid">
                <label class="reporter-field">
                  <span>${escapeHtml(copy.reporterName)}</span>
                  <input data-reporter-name autocomplete="name" value="${escapeHtml(state.reporterName)}" ${reporterFields === "required" ? "required" : ""}>
                </label>
                <label class="reporter-field">
                  <span>${escapeHtml(copy.reporterEmail)}</span>
                  <input data-reporter-email autocomplete="email" inputmode="email" type="email" value="${escapeHtml(state.reporterEmail)}" ${reporterFields === "required" ? "required" : ""}>
                </label>
              </div>
              ${reporterEmailInvalid ? `<span class="field-error">${escapeHtml(copy.reporterEmailInvalid)}</span>` : ""}
            </div>
          </div>
          <div class="manager-actions reporter-actions">
            <button class="manager-button primary" data-action="save-reporter" ${reporterEmailInvalid ? "disabled" : ""}>${lucideIcons.check}${escapeHtml(copy.reporterSave)}</button>
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
            <div class="manager-actions">
              ${reporterUpdateIds.length ? `<button class="manager-button secondary" data-action="update-sent-reporters" ${state.sending ? "disabled" : ""}>${lucideIcons.mail}${escapeHtml(copy.updateReporterCount.replace("{count}", String(reporterUpdateIds.length)))}</button>` : ""}
              <button class="manager-button secondary" data-action="close-manager">${lucideIcons.x}${escapeHtml(copy.close)}</button>
            </div>
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
                      ${capturePreviewMarkup(feedback, copy.note)}
                    </div>
                    <div class="manager-actions">
                      <button class="manager-button danger" data-action="cancel-sent-feedback" data-feedback-id="${escapeHtml(feedback.feedbackId)}" data-feedback-kind="note" ${state.sending ? "disabled" : ""}>${lucideIcons.undo}${escapeHtml(copy.removeFeedback)}</button>
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
                      <button class="manager-button danger" data-action="cancel-sent-feedback" data-feedback-id="${escapeHtml(pin.feedbackId ?? "")}" ${state.sending ? "disabled" : ""}>${lucideIcons.undo}${escapeHtml(copy.removeFeedback)}</button>
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
                      <button class="manager-button danger" data-action="cancel-sent-feedback" data-feedback-id="${escapeHtml(feedback.feedbackId)}" data-feedback-kind="capture" ${state.sending ? "disabled" : ""}>${lucideIcons.undo}${escapeHtml(copy.removeFeedback)}</button>
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
      const reporter = currentReporter(state.reporterName, state.reporterEmail);
      const reporterEmailInvalid = Boolean(state.reporterEmail.trim()) && !isValidEmail(state.reporterEmail.trim());
      const reporterReady = reporterFields !== "required" || Boolean(reporter?.name && reporter.email && !reporterEmailInvalid);
      const canSubmit = !state.sending && reporterReady && !reporterEmailInvalid;
      const mainSendButton = shadow.querySelector<HTMLButtonElement>("[data-action='send']");
      if (mainSendButton) {
        mainSendButton.disabled = !canSubmit || getReadyDraftFeedbackCount() === 0;
      }

      shadow.querySelectorAll<HTMLButtonElement>("[data-action='send-pin']").forEach((button) => {
        const index = Number(button.dataset.pinIndex);
        const pin = state.pins[index];
        button.disabled = !canSubmit || !pin || pin.status === "sent" || !pin.message.trim();
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
      if (!state.open) {
        state.reporterOpen = false;
      }
      render();
    });

    shadow.querySelector<HTMLButtonElement>("[data-action='close']")?.addEventListener("click", () => {
      state.open = false;
      state.reporterOpen = false;
      render();
    });

    shadow.querySelector<HTMLButtonElement>("[data-action='open-manager']")?.addEventListener("click", () => {
      state.managerOpen = true;
      state.helpOpen = false;
      state.reporterOpen = false;
      render();
    });

    shadow.querySelector<HTMLButtonElement>("[data-action='open-help']")?.addEventListener("click", () => {
      state.helpOpen = true;
      state.managerOpen = false;
      state.reporterOpen = false;
      render();
    });

    shadow.querySelectorAll<HTMLButtonElement>("[data-action='close-help']").forEach((button) => {
      button.addEventListener("click", () => {
        state.helpOpen = false;
        render();
      });
    });

    shadow.querySelectorAll<HTMLButtonElement>("[data-action='close-manager']").forEach((button) => {
      button.addEventListener("click", () => {
        state.managerOpen = false;
        render();
      });
    });

    shadow.querySelectorAll<HTMLButtonElement>("[data-action='close-reporter']").forEach((button) => {
      button.addEventListener("click", () => {
        state.reporterOpen = false;
        render();
      });
    });

    shadow.querySelector<HTMLButtonElement>("[data-action='save-reporter']")?.addEventListener("click", () => {
      if (state.reporterEmail.trim() && !isValidEmail(state.reporterEmail.trim())) {
        return;
      }

      persistReporter(reporterStorageKey, currentReporter(state.reporterName, state.reporterEmail));
      state.reporterOpen = false;
      render();
    });

    shadow.querySelector<HTMLButtonElement>("[data-action='update-sent-reporters']")?.addEventListener("click", async () => {
      const reporter = currentReporter(state.reporterName, state.reporterEmail);
      if (!reporter || !canSubmitWithReporter("optional", reporter)) {
        return;
      }

      const ids = [...new Set([
        ...state.sentFeedbacks
          .filter((feedback) => !sameReporter(feedback.reporter, reporter))
          .map((feedback) => feedback.feedbackId),
        ...state.pins
          .filter((pin) => pin.status === "sent" && pin.feedbackId && !sameReporter(pin.reporter, reporter))
          .map((pin) => pin.feedbackId as string)
      ])];

      if (ids.length === 0) {
        return;
      }

      state.sending = true;
      render();
      try {
        for (const feedbackId of ids) {
          await updateFeedbackReporter({
            endpoint,
            feedbackId,
            projectKey: options.projectKey,
            reporter
          });
        }

        state.sentFeedbacks = state.sentFeedbacks.map((feedback) => {
          if (!ids.includes(feedback.feedbackId)) {
            return feedback;
          }

          const nextFeedback = { ...feedback, reporter };
          persistSentFeedback(sentFeedbacksStorageKey, state.viewKey, nextFeedback);
          return nextFeedback;
        });
        state.pins = state.pins.map((pin) => {
          if (pin.status !== "sent" || !pin.feedbackId || !ids.includes(pin.feedbackId)) {
            return pin;
          }

          const nextPin = { ...pin, reporter };
          persistSentPin(sentPinsStorageKey, state.viewKey, nextPin);
          return nextPin;
        });
        state.notice = copy.sent;
        window.setTimeout(() => {
          state.notice = "";
          render();
        }, 3600);
      } catch (error) {
        console.error("[ChangeThis] Failed to update feedback contact", error);
        window.alert(copy.alertError);
      } finally {
        state.sending = false;
        render();
      }
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
      state.captureUploadDataUrl = undefined;
      state.captureUploadName = undefined;
      render();
    });

    shadow.querySelector<HTMLButtonElement>("[data-action='add-pin']")?.addEventListener("click", () => {
      state.pinsVisible = true;
      requestPin();
    });
    shadow.querySelector<HTMLButtonElement>("[data-action='toggle-pins']")?.addEventListener("click", () => {
      state.pinsVisible = !state.pinsVisible;
      render();
    });
    shadow.querySelector<HTMLButtonElement>("[data-action='define-capture']")?.addEventListener("click", requestCaptureArea);
    shadow.querySelector<HTMLButtonElement>("[data-action='paste-capture']")?.addEventListener("click", async () => {
      try {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const type = item.types.find((candidate) => manualCaptureUploadTypes.includes(candidate));
          if (type) {
            state.captureUploadDataUrl = await readCaptureUpload(await item.getType(type));
            state.captureUploadName = "clipboard-image";
            render();
            return;
          }
        }
      } catch {
      }
      window.alert(copy.uploadCaptureInvalid);
      render();
    });
    shadow.querySelector<HTMLInputElement>("[data-capture-upload]")?.addEventListener("change", async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) {
        return;
      }

      try {
        state.captureUploadDataUrl = await readCaptureUpload(file);
        state.captureUploadName = file.name;
      } catch {
        window.alert(copy.uploadCaptureInvalid);
        state.captureUploadDataUrl = undefined;
        state.captureUploadName = undefined;
      }
      render();
    });
    shadow.querySelector<HTMLButtonElement>("[data-action='remove-capture-upload']")?.addEventListener("click", () => {
      state.captureUploadDataUrl = undefined;
      state.captureUploadName = undefined;
      render();
    });

    shadow.querySelectorAll<HTMLButtonElement>("[data-action='remove-pin']").forEach((button) => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.pinIndex);
        state.pins = state.pins.filter((_, pinIndex) => pinIndex !== index);
        if (state.pins.length === 0 && state.type === "pin") {
          state.type = firstMode as FeedbackType;
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
        const nextType = button.dataset.mode as FeedbackType;
        state.type = isModeEnabled(nextType, activeModes) ? nextType : firstMode as FeedbackType;
        state.notice = "";
        render();
      });
    });

    shadow.querySelector<HTMLButtonElement>("[data-action='toggle-reporter']")?.addEventListener("click", () => {
      state.reporterOpen = !state.reporterOpen;
      if (state.reporterOpen) {
        state.helpOpen = false;
        state.managerOpen = false;
      }
      render();
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

    shadow.querySelector<HTMLInputElement>("[data-reporter-name]")?.addEventListener("input", (event) => {
      state.reporterName = (event.target as HTMLInputElement).value;
      refreshDraftSendControls();
    });

    shadow.querySelector<HTMLInputElement>("[data-reporter-email]")?.addEventListener("input", (event) => {
      state.reporterEmail = (event.target as HTMLInputElement).value;
      refreshDraftSendControls();
    });

    shadow.querySelectorAll<HTMLButtonElement>("[data-action='send-pin']").forEach((button) => {
      button.addEventListener("click", async () => {
        syncDraftView();
        const index = Number(button.dataset.pinIndex);
        const draft = state.pins[index];
        const reporter = currentReporter(state.reporterName, state.reporterEmail);
        if (!draft || draft.status === "sent" || !draft.message.trim() || !canSubmitWithReporter(reporterFields, reporter)) return;

        state.sending = true;
        render();
        try {
          const target = resolvePinTargetForSubmission(draft.target);
          const submitted = await submitFeedback({
            endpoint,
            projectKey: options.projectKey,
            type: "pin",
            message: draft.message,
            pins: [target],
            reporter,
            appEnvironment
          });
          const sentAt = new Date().toISOString();
          state.pins[index] = {
            ...draft,
            target,
            status: "sent",
            feedbackId: submitted.id,
            reporter,
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
      const pendingCapture = (state.captureArea || state.captureUploadDataUrl) && state.captureMessage.trim()
        ? { message: state.captureMessage, captureArea: state.captureArea, uploadedScreenshotDataUrl: state.captureUploadDataUrl }
        : undefined;
      const reporter = currentReporter(state.reporterName, state.reporterEmail);

      if ((!pendingNoteMessage && pendingPins.length === 0 && !pendingCapture) || !canSubmitWithReporter(reporterFields, reporter)) {
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
            reporter,
            appEnvironment
          });

          if (submitted.id) {
            const sentFeedback: StoredSentFeedback = {
              viewKey: state.viewKey,
              feedbackId: submitted.id,
              type: "comment",
              message: pendingNoteMessage,
              reporter,
              sentAt: new Date().toISOString(),
              screenshotDataUrl: submitted.screenshotDataUrl
            };
            state.sentFeedbacks = [sentFeedback, ...state.sentFeedbacks].slice(0, 120);
            persistSentFeedback(sentFeedbacksStorageKey, state.viewKey, sentFeedback);
          }

          state.noteMessage = "";
        }

        for (const { pin, index } of pendingPins) {
          const target = resolvePinTargetForSubmission(pin.target);
          const submitted = await submitFeedback({
            endpoint,
            projectKey: options.projectKey,
            type: "pin",
            message: pin.message,
            pins: [target],
            reporter,
            appEnvironment
          });
          const sentAt = new Date().toISOString();
          state.pins[index] = {
            ...pin,
            target,
            status: "sent",
            feedbackId: submitted.id,
            reporter,
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
            uploadedScreenshotDataUrl: pendingCapture.uploadedScreenshotDataUrl,
            reporter,
            appEnvironment
          });

          if (submitted.id) {
            const sentFeedback: StoredSentFeedback = {
              viewKey: state.viewKey,
              feedbackId: submitted.id,
              type: "screenshot",
              message: pendingCapture.message,
              reporter,
              sentAt: new Date().toISOString(),
              captureArea: pendingCapture.captureArea,
              screenshotDataUrl: submitted.screenshotDataUrl
            };
            state.sentFeedbacks = [sentFeedback, ...state.sentFeedbacks].slice(0, 120);
            persistSentFeedback(sentFeedbacksStorageKey, state.viewKey, sentFeedback);
          }

          state.captureMessage = "";
          state.captureArea = undefined;
          state.captureUploadDataUrl = undefined;
          state.captureUploadName = undefined;
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

  const handleScrollOrResize = () => {
    updatePinnedMarkers();
    updateFloatingOffset();
  };

  window.addEventListener("scroll", handleScrollOrResize, { capture: true, passive: true });
  document.addEventListener("scroll", handleScrollOrResize, { capture: true, passive: true });
  window.addEventListener("resize", handleScrollOrResize);
  window.visualViewport?.addEventListener("resize", handleScrollOrResize);
  window.visualViewport?.addEventListener("scroll", handleScrollOrResize);
  document.addEventListener("keydown", (event) => {
    if (!isHiddenDisplayMode || !isWidgetShortcut(event)) {
      return;
    }

    event.preventDefault();
    state.open = !state.open;
    state.notice = "";
    render();
  }, true);
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
  reporter?: FeedbackReporter;
  pins?: PinTarget[];
  captureArea?: CaptureArea;
  uploadedScreenshotDataUrl?: string;
  appEnvironment?: FeedbackAppEnvironment;
}): Promise<{ id?: string; screenshotDataUrl?: string }> {
  lastCaptureDiagnostics = undefined;
  const screenshotDataUrl = params.uploadedScreenshotDataUrl ?? await captureFeedbackScreenshot({
    type: params.type,
    captureArea: params.captureArea,
    pinTargets: params.pins,
    captureViewport,
    capturePageFeedbackPreview,
    warn: console.warn
  });
  const capture = takeLastCaptureMetadata();
  const screenshotThumbnailDataUrl = screenshotDataUrl
    ? await createImageThumbnail(screenshotDataUrl)
    : undefined;

  const payload: FeedbackPayload = {
    projectKey: params.projectKey,
    type: params.type,
    message: params.message,
    reporter: params.reporter,
    pin: params.pins?.[0],
    pins: params.pins?.length ? params.pins : undefined,
    captureArea: params.captureArea,
    screenshotDataUrl,
    screenshotThumbnailDataUrl,
    screenshotSource: params.uploadedScreenshotDataUrl ? "user_upload" : screenshotDataUrl ? "client_capture" : undefined,
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
      document: collectDocumentSize(),
      network: collectNetworkInfo(),
      devicePixelRatio: window.devicePixelRatio,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      online: navigator.onLine,
      app: params.appEnvironment,
      capture,
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

async function updateFeedbackReporter(params: {
  endpoint: string;
  feedbackId: string;
  projectKey: string;
  reporter: FeedbackReporter;
}): Promise<void> {
  const response = await fetch(publicFeedbackActionUrl(params.endpoint, `${params.feedbackId}/reporter`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      projectKey: params.projectKey,
      reporter: params.reporter
    })
  });

  if (!response.ok) {
    throw new Error(`Feedback reporter API returned ${response.status}`);
  }
}

function publicFeedbackActionUrl(endpoint: string, actionPath: string): string {
  const url = new URL(endpoint, window.location.href);
  const basePath = url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;
  url.pathname = `${basePath}${actionPath}`;
  return url.toString();
}

function startCaptureSelection(label: string, cancelLabel: string, onSelect: (area: CaptureArea) => void, onCancel?: () => void): void {
  const layer = document.createElement("div");
  layer.innerHTML = `
    <style>
      .changethis-selection-layer {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        cursor: crosshair;
        background: rgba(17, 24, 39, 0.18);
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
      }
      .changethis-selection-help {
        align-items: center;
        display: flex;
        gap: 10px;
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
      .changethis-selection-help button {
        border: 1px solid rgba(255, 255, 255, 0.28);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.12);
        color: #fff;
        cursor: pointer;
        font: inherit;
        padding: 4px 8px;
      }
      .changethis-selection-box {
        position: fixed;
        border: 2px solid #fff;
        background: rgba(15, 118, 110, 0.22);
        box-shadow: 0 0 0 9999px rgba(17, 24, 39, 0.36);
      }
    </style>
    <div class="changethis-selection-layer">
      <div class="changethis-selection-help">${escapeHtml(label)} <button type="button" data-changethis-selection-cancel>${escapeHtml(cancelLabel)}</button></div>
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

  layer.querySelector<HTMLElement>("[data-changethis-selection-cancel]")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    finish(onCancel);
  });

  surface?.addEventListener("pointerdown", (event) => {
    if ((event.target as Element | null)?.closest("[data-changethis-selection-cancel]")) {
      return;
    }

    event.preventDefault();
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
    event.preventDefault();
    latestX = event.clientX;
    latestY = event.clientY;
    updateBox();
  });

  surface?.addEventListener("pointerup", (event) => {
    if (!dragging) return;
    event.preventDefault();
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

function startPinMode(label: string, cancelLabel: string, onSelect: (pin: PinTarget) => void, onCancel?: () => void): void {
  const layer = document.createElement("div");
  layer.innerHTML = `
    <style>
      .changethis-pin-layer {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        cursor: crosshair;
        background: rgba(17, 24, 39, 0.12);
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
      }
      .changethis-pin-help {
        align-items: center;
        display: flex;
        gap: 10px;
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
      .changethis-pin-help button {
        border: 1px solid rgba(255, 255, 255, 0.28);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.12);
        color: #fff;
        cursor: pointer;
        font: inherit;
        padding: 4px 8px;
      }
    </style>
    <div class="changethis-pin-layer">
      <div class="changethis-pin-help">${escapeHtml(label)} <button type="button" data-changethis-pin-cancel>${escapeHtml(cancelLabel)}</button></div>
    </div>
  `;
  document.documentElement.appendChild(layer);

  const surface = layer.querySelector<HTMLElement>(".changethis-pin-layer");
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

  layer.querySelector<HTMLElement>("[data-changethis-pin-cancel]")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    finish(onCancel);
  });

  surface?.addEventListener("pointerdown", (event) => {
    if ((event.target as Element | null)?.closest("[data-changethis-pin-cancel]")) {
      return;
    }

    event.preventDefault();
  });

  surface?.addEventListener("pointerup", (event) => {
    if ((event.target as Element | null)?.closest("[data-changethis-pin-cancel]")) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const clientX = event.clientX;
    const clientY = event.clientY;
    layer.style.pointerEvents = "none";
    const target = document.elementFromPoint(clientX, clientY);
    layer.style.pointerEvents = "";

    finish(() => onSelect({
      x: clientX + window.scrollX,
      y: clientY + window.scrollY,
      elementOffsetX: target ? clientX - target.getBoundingClientRect().left : undefined,
      elementOffsetY: target ? clientY - target.getBoundingClientRect().top : undefined,
      selector: target ? buildSelector(target) : undefined,
      text: target?.textContent?.trim().slice(0, 120)
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

async function capturePageFeedbackPreview(): Promise<string | undefined> {
  try {
    return await captureViewport(undefined, {
      maxDimension: pageFeedbackScreenshotMaxDimension,
      quality: pageFeedbackScreenshotQuality
    });
  } catch (error) {
    console.warn("[ChangeThis] Failed to capture page preview", error);
    return undefined;
  }
}

async function captureViewport(
  area?: CaptureArea,
  options: { maxDimension?: number; quality?: number; pinTargets?: PinTarget[] } = {}
): Promise<string | undefined> {
  const pinCaptureOverlay = options.pinTargets?.length ? renderTemporaryPinCaptureOverlay(options.pinTargets) : undefined;
  const preparationDiagnostics = await prepareDocumentForCapture();

  try {
    maskSensitiveFields(true);
    const canvas = await capturePage(document.body, {
      height: window.innerHeight,
      onclone: (clonedDocument) => {
        const styleDiagnostics = sanitizeUnsupportedCaptureStyles(clonedDocument);
        lastCaptureDiagnostics = mergeCaptureDiagnostics(preparationDiagnostics, styleDiagnostics);
      },
      width: window.innerWidth,
      windowHeight: window.innerHeight,
      windowWidth: window.innerWidth,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      useCORS: true
    });
    const output = area ? cropCanvas(canvas, area) : canvas;
    const resized = resizeCanvasToMax(output, options.maxDimension ?? maxScreenshotDimension);
    return encodeCanvas(resized, options.quality ?? screenshotQuality);
  } finally {
    pinCaptureOverlay?.remove();
    maskSensitiveFields(false);
  }
}

function renderTemporaryPinCaptureOverlay(pinTargets: PinTarget[]): HTMLElement {
  const overlay = document.createElement("div");
  overlay.dataset.changethisCaptureOverlay = "pins";
  overlay.style.cssText = [
    "position:fixed",
    "inset:0",
    "z-index:2147483646",
    "pointer-events:none",
    "font-family:Inter,ui-sans-serif,system-ui,sans-serif"
  ].join(";");

  pinTargets.forEach((pin, index) => {
    const position = pinViewportPosition(pin);
    const marker = document.createElement("div");
    marker.textContent = String(index + 1);
    marker.style.cssText = [
      "position:absolute",
      `left:${Math.round(position.x)}px`,
      `top:${Math.round(position.y)}px`,
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
  return overlay;
}

function sanitizeUnsupportedCaptureStyles(clonedDocument: Document): CaptureDiagnostics {
  const view = clonedDocument.defaultView;
  const root = clonedDocument.documentElement;
  const diagnostics: CaptureDiagnostics = {
    cssColorConversionCount: 0,
    cssFallbackCount: 0,
    removedBackgroundImageCount: 0
  };

  if (!view || !root) {
    return diagnostics;
  }

  const elements = [root, ...Array.from(root.querySelectorAll<HTMLElement | SVGElement>("*"))];

  for (const element of elements) {
    const computed = view.getComputedStyle(element);
    for (let index = 0; index < computed.length; index += 1) {
      const property = computed.item(index);
      const value = computed.getPropertyValue(property);

      if (hasUnsupportedColorFunction(value)) {
        const convertedValue = convertUnsupportedColorFunctions(clonedDocument, value);
        if (convertedValue && convertedValue !== value) {
          element.style.setProperty(property, convertedValue, "important");
          diagnostics.cssColorConversionCount = (diagnostics.cssColorConversionCount ?? 0) + 1;
          continue;
        }

        const fallback = captureFallbackValue(property);
        element.style.setProperty(property, fallback, "important");
        diagnostics.cssFallbackCount = (diagnostics.cssFallbackCount ?? 0) + 1;
        if (property === "background-image" && fallback === "none") {
          diagnostics.removedBackgroundImageCount = (diagnostics.removedBackgroundImageCount ?? 0) + 1;
        }
      }
    }
  }

  return diagnostics;
}

function hasUnsupportedColorFunction(value: string): boolean {
  return /\b(?:oklch|oklab|lch|lab)\(/i.test(value);
}

function convertUnsupportedColorFunctions(document: Document, value: string): string | undefined {
  const colorFunctionPattern = /\b(?:oklch|oklab|lch|lab)\([^)]*\)/gi;
  let converted = value;

  for (const match of value.match(colorFunctionPattern) ?? []) {
    const resolved = resolveCssColor(document, match);
    if (!resolved) {
      return undefined;
    }

    converted = converted.replace(match, resolved);
  }

  return converted;
}

function resolveCssColor(document: Document, color: string): string | undefined {
  const view = document.defaultView;
  if (!view || !document.body) {
    return undefined;
  }

  const probe = document.createElement("span");
  probe.style.color = color;
  if (!probe.style.color) {
    return undefined;
  }

  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  document.body.appendChild(probe);
  const resolved = view.getComputedStyle(probe).color;
  probe.remove();
  return resolved && resolved !== color ? resolved : undefined;
}

function captureFallbackValue(property: string): string {
  if (property.includes("shadow") || property.includes("gradient") || property === "background-image") {
    return "none";
  }

  if (property === "background-color") {
    return "transparent";
  }

  if (property === "color") {
    return "#111827";
  }

  if (property.endsWith("color") || property === "stroke") {
    return "rgba(17, 24, 39, 0.28)";
  }

  if (property === "fill") {
    return "currentColor";
  }

  return "initial";
}

async function prepareDocumentForCapture(): Promise<CaptureDiagnostics> {
  const diagnostics: CaptureDiagnostics = {
    crossOriginIframeCount: document.querySelectorAll("iframe[src]").length,
    fontReadyTimedOut: await waitForFontsReady(),
    unloadedVisibleImageCount: countUnloadedVisibleImages()
  };
  await nextAnimationFrame();
  await nextAnimationFrame();
  return diagnostics;
}

async function waitForFontsReady(): Promise<boolean> {
  const fonts = document.fonts;
  if (!fonts?.ready) {
    return false;
  }

  return await withTimeout(fonts.ready.then(() => undefined), capturePreparationTimeoutMs);
}

function countUnloadedVisibleImages(): number {
  const images = Array.from(document.images).filter((image) => isVisibleImage(image));
  return images.filter((image) => !image.complete || image.naturalWidth === 0 || image.naturalHeight === 0).length;
}

function isVisibleImage(image: HTMLImageElement): boolean {
  const rect = image.getBoundingClientRect();
  return rect.width > 0
    && rect.height > 0
    && rect.bottom >= 0
    && rect.right >= 0
    && rect.top <= window.innerHeight
    && rect.left <= window.innerWidth;
}

async function withTimeout(promise: Promise<unknown>, timeoutMs: number): Promise<boolean> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timedOut = await Promise.race([
    promise.then(() => false, () => false),
    new Promise<boolean>((resolve) => {
      timeout = setTimeout(() => resolve(true), timeoutMs);
    })
  ]);

  if (timeout) {
    clearTimeout(timeout);
  }

  return timedOut;
}

function nextAnimationFrame(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

function mergeCaptureDiagnostics(...items: Array<CaptureDiagnostics | undefined>): CaptureDiagnostics {
  const merged: CaptureDiagnostics = {};

  for (const item of items) {
    if (!item) {
      continue;
    }

    merged.cssColorConversionCount = (merged.cssColorConversionCount ?? 0) + (item.cssColorConversionCount ?? 0);
    merged.cssFallbackCount = (merged.cssFallbackCount ?? 0) + (item.cssFallbackCount ?? 0);
    merged.removedBackgroundImageCount = (merged.removedBackgroundImageCount ?? 0) + (item.removedBackgroundImageCount ?? 0);
    merged.unloadedVisibleImageCount = (merged.unloadedVisibleImageCount ?? 0) + (item.unloadedVisibleImageCount ?? 0);
    merged.crossOriginIframeCount = (merged.crossOriginIframeCount ?? 0) + (item.crossOriginIframeCount ?? 0);
    merged.fontReadyTimedOut = Boolean(merged.fontReadyTimedOut || item.fontReadyTimedOut);
    merged.preparationTimedOut = Boolean(merged.preparationTimedOut || item.preparationTimedOut);
  }

  return merged;
}

function takeLastCaptureMetadata(): FeedbackCaptureMetadata | undefined {
  const diagnostics = lastCaptureDiagnostics;
  lastCaptureDiagnostics = undefined;

  if (!diagnostics) {
    return undefined;
  }

  const risk = Boolean(
    diagnostics.cssFallbackCount
    || diagnostics.removedBackgroundImageCount
    || diagnostics.unloadedVisibleImageCount
    || diagnostics.crossOriginIframeCount
    || diagnostics.fontReadyTimedOut
    || diagnostics.preparationTimedOut
  );

  return {
    source: "client",
    risk,
    ...diagnostics
  };
}

async function createImageThumbnail(dataUrl: string): Promise<string | undefined> {
  const image = new Image();
  image.decoding = "async";

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Unable to load screenshot thumbnail source"));
      image.src = dataUrl;
    });
  } catch {
    return undefined;
  }

  const canvas = document.createElement("canvas");
  const ratio = Math.min(1, maxThumbnailDimension / Math.max(image.naturalWidth, image.naturalHeight, 1));
  canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
  const context = canvas.getContext("2d");

  if (!context) {
    return undefined;
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return encodeCanvas(canvas, thumbnailQuality);
}

function readCaptureUpload(file: Blob): Promise<string> {
  if (!manualCaptureUploadTypes.includes(file.type) || file.size > maxManualCaptureUploadBytes) {
    return Promise.reject(new Error("Invalid capture upload"));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (isSafeImageDataUrl(result)) {
        resolve(result);
        return;
      }

      reject(new Error("Invalid capture upload data URL"));
    };
    reader.onerror = () => reject(new Error("Unable to read capture upload"));
    reader.readAsDataURL(file);
  });
}

function resizeCanvasToMax(source: HTMLCanvasElement, maxDimension: number): HTMLCanvasElement {
  const ratio = Math.min(1, maxDimension / Math.max(source.width, source.height, 1));
  if (ratio >= 1) {
    return source;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * ratio));
  canvas.height = Math.max(1, Math.round(source.height * ratio));
  const context = canvas.getContext("2d");

  if (!context) {
    return source;
  }

  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function encodeCanvas(canvas: HTMLCanvasElement, quality: number): string {
  const webp = canvas.toDataURL("image/webp", quality);
  return webp.startsWith("data:image/webp;base64,")
    ? webp
    : canvas.toDataURL("image/jpeg", quality);
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
  const element = pin.selector ? safeQuerySelector(pin.selector) : null;
  if (element && typeof pin.elementOffsetX === "number" && typeof pin.elementOffsetY === "number") {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left + pin.elementOffsetX,
      y: rect.top + pin.elementOffsetY
    };
  }

  return {
    x: pin.x - window.scrollX,
    y: pin.y - window.scrollY
  };
}

function resolvePinTargetForSubmission(pin: PinTarget): PinTarget {
  const element = pin.selector ? safeQuerySelector(pin.selector) : null;
  if (!element || typeof pin.elementOffsetX !== "number" || typeof pin.elementOffsetY !== "number") {
    return pin;
  }

  const rect = element.getBoundingClientRect();

  return {
    ...pin,
    x: Math.round(rect.left + pin.elementOffsetX + window.scrollX),
    y: Math.round(rect.top + pin.elementOffsetY + window.scrollY)
  };
}

function safeQuerySelector(selector: string): Element | null {
  try {
    return document.querySelector(selector);
  } catch {
    return null;
  }
}

function currentViewKey(): string {
  return `${window.location.origin}${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function currentReporter(name: string, email: string): FeedbackReporter | undefined {
  const trimmedName = name.trim();
  const trimmedEmail = email.trim();

  if (!trimmedName && !trimmedEmail) {
    return undefined;
  }

  return {
    name: trimmedName || undefined,
    email: trimmedEmail || undefined
  };
}

function sameReporter(left: FeedbackReporter | undefined, right: FeedbackReporter | undefined): boolean {
  return (left?.name ?? "") === (right?.name ?? "") && (left?.email ?? "") === (right?.email ?? "");
}

function canSubmitWithReporter(mode: WidgetReporterFields, reporter: FeedbackReporter | undefined): boolean {
  if (reporter?.email && !isValidEmail(reporter.email)) {
    return false;
  }

  return mode !== "required" || Boolean(reporter?.name && reporter.email);
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function readStoredReporter(storageKey: string): FeedbackReporter {
  try {
    const raw = window.localStorage.getItem(storageKey);
    const value = raw ? JSON.parse(raw) : undefined;
    return parseStoredReporter(value) ?? {};
  } catch {
    return {};
  }
}

function parseStoredReporter(value: unknown): FeedbackReporter | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const reporter = {
    name: safeDataValue(typeof value.name === "string" ? value.name : undefined),
    email: safeDataValue(typeof value.email === "string" ? value.email : undefined)
  };

  return reporter.name || reporter.email ? reporter : undefined;
}

function persistReporter(storageKey: string, reporter: FeedbackReporter | undefined): void {
  try {
    if (!reporter?.name && !reporter?.email) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(reporter));
  } catch {
    // Ignore storage failures: reporter details are still sent with the current feedback.
  }
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
      reporter: pin.reporter,
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
    reporter: pin.reporter,
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
    reporter: parseStoredReporter(value.reporter),
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
    reporter: parseStoredReporter(value.reporter),
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
    elementOffsetX: typeof value.elementOffsetX === "number" && Number.isFinite(value.elementOffsetX) ? value.elementOffsetX : undefined,
    elementOffsetY: typeof value.elementOffsetY === "number" && Number.isFinite(value.elementOffsetY) ? value.elementOffsetY : undefined,
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

function collectDocumentSize(): FeedbackPayload["metadata"]["document"] {
  const root = document.documentElement;
  const body = document.body;

  return {
    width: Math.max(root.scrollWidth, root.clientWidth, body?.scrollWidth ?? 0, body?.clientWidth ?? 0, window.innerWidth),
    height: Math.max(root.scrollHeight, root.clientHeight, body?.scrollHeight ?? 0, body?.clientHeight ?? 0, window.innerHeight)
  };
}

function collectNetworkInfo(): FeedbackPayload["metadata"]["network"] {
  const extendedNavigator = navigator as Navigator & {
    connection?: NetworkInformationLike;
    mozConnection?: NetworkInformationLike;
    webkitConnection?: NetworkInformationLike;
  };
  const connection = extendedNavigator.connection ?? extendedNavigator.mozConnection ?? extendedNavigator.webkitConnection;

  if (!connection) {
    return undefined;
  }

  return {
    effectiveType: typeof connection.effectiveType === "string" ? connection.effectiveType : undefined,
    type: typeof connection.type === "string" ? connection.type : undefined,
    downlink: typeof connection.downlink === "number" ? connection.downlink : undefined,
    rtt: typeof connection.rtt === "number" ? connection.rtt : undefined,
    saveData: typeof connection.saveData === "boolean" ? connection.saveData : undefined
  };
}

type NetworkInformationLike = {
  effectiveType?: string;
  type?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
};

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
  const scriptOptions = widgetOptionsFromScript(currentScript, projectKey);

  startWidgetWithConfig(currentScript, scriptOptions);
}

function startWidgetWithConfig(script: HTMLScriptElement | null, fallback: WidgetOptions): void {
  let initializedWithFallback = false;
  const configPromise = resolveWidgetOptions(script, fallback);
  const fallbackTimer = window.setTimeout(() => {
    initializedWithFallback = true;
    initChangeThis(fallback);
  }, widgetConfigStartupTimeoutMs);

  void configPromise
    .then((resolvedOptions) => {
      window.clearTimeout(fallbackTimer);
      if (initializedWithFallback) {
        removeWidgetRoot();
      }
      initChangeThis(resolvedOptions);
    })
    .catch(() => {
      window.clearTimeout(fallbackTimer);
      if (!initializedWithFallback) {
        initChangeThis(fallback);
      }
    });
}

function widgetOptionsFromScript(script: HTMLScriptElement | null, projectKey: string): WidgetOptions {
  const variant = script?.dataset.buttonVariant;
  const position = script?.dataset.position;
  const reporterFields = script?.dataset.reporterFields;

  return {
    projectKey,
    endpoint: script?.dataset.endpoint ?? scriptEndpoint(script),
    buttonLabel: script?.dataset.buttonLabel,
    title: normalizeWidgetTitle(script?.dataset.widgetTitle, undefined),
    modes: parseWidgetModes(script?.dataset.modes),
    buttonStateLabel: script?.dataset.buttonState,
    buttonVariant: variant === "dev" || variant === "prod" || variant === "review" || variant === "subtle" ? variant : undefined,
    displayMode: parseWidgetDisplayMode(script?.dataset.displayMode),
    buttonPosition: position === "bottom-right" || position === "bottom-left" || position === "top-right" || position === "top-left" ? position : undefined,
    reporterFields: reporterFields === "hidden" || reporterFields === "optional" || reporterFields === "required" ? reporterFields : undefined,
    locale: script?.dataset.locale === "fr" || script?.dataset.locale === "en" ? script.dataset.locale : undefined,
    visible: script?.dataset.visible !== "false",
    environment: script?.dataset.environment,
    release: script?.dataset.release,
    appVersion: script?.dataset.appVersion,
    buildId: script?.dataset.buildId,
    commitSha: script?.dataset.commitSha,
    branch: script?.dataset.branch,
    testRunId: script?.dataset.testRunId,
    scenario: script?.dataset.scenario,
    customer: script?.dataset.customer
  };
}

async function resolveWidgetOptions(script: HTMLScriptElement | null, fallback: WidgetOptions): Promise<WidgetOptions> {
  const configUrl = widgetConfigUrl(script, fallback.projectKey);
  if (!configUrl) {
    return fallback;
  }

  const response = await fetch(configUrl, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    return fallback;
  }

  const config = await response.json() as unknown;
  if (!isWidgetConfigResponse(config)) {
    return fallback;
  }

  return {
    ...fallback,
    endpoint: config.endpoint ? new URL(config.endpoint, configUrl).toString() : fallback.endpoint,
    locale: config.locale ?? fallback.locale,
    buttonPosition: config.buttonPosition ?? config.button_position ?? fallback.buttonPosition,
    buttonVariant: config.buttonVariant ?? config.button_variant ?? fallback.buttonVariant,
    displayMode: config.displayMode ?? config.display_mode ?? fallback.displayMode,
    reporterFields: config.reporterFields ?? config.reporter_fields ?? fallback.reporterFields,
    title: normalizeWidgetTitle(config.title, fallback.title),
    modes: normalizeWidgetModes(Array.isArray(config.modes) ? config.modes : fallback.modes),
    visible: typeof config.visible === "boolean" ? config.visible : fallback.visible
  };
}

function scriptEndpoint(script: HTMLScriptElement | null): string | undefined {
  return script?.src ? new URL("/api/public/feedback", script.src).toString() : undefined;
}

function widgetConfigUrl(script: HTMLScriptElement | null, projectKey: string): string | undefined {
  if (!script?.src) {
    return undefined;
  }

  const url = new URL("/api/widget/config", script.src);
  url.searchParams.set("project", projectKey);
  return url.toString();
}

function isWidgetConfigResponse(value: unknown): value is WidgetConfigResponse {
  if (!isRecord(value)) {
    return false;
  }

  return true;
}

function parseWidgetDisplayMode(value: string | undefined): WidgetOptions["displayMode"] {
  if (value === "standard" || value === "subtle" || value === "hidden" || value === "disabled") {
    return value;
  }

  return undefined;
}

function displayModeFromButtonVariant(value: WidgetOptions["buttonVariant"]): WidgetOptions["displayMode"] {
  return value === "subtle" ? "subtle" : "standard";
}

function removeWidgetRoot(): void {
  document.getElementById(rootId)?.remove();
}

function isWidgetShortcut(event: KeyboardEvent): boolean {
  return event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey && event.key.toLowerCase() === "f";
}

function prefersViewportCapture(): boolean {
  const coarsePointer = window.matchMedia?.("(pointer: coarse)").matches === true;
  const smallViewport = window.matchMedia?.("(max-width: 640px)").matches === true || window.innerWidth <= 640;
  return coarsePointer || smallViewport;
}

function currentViewportCaptureArea(): CaptureArea {
  return {
    x: 0,
    y: 0,
    width: Math.max(1, Math.round(window.innerWidth)),
    height: Math.max(1, Math.round(window.innerHeight))
  };
}

function normalizeWidgetTitle(value: string | undefined, fallback: string | undefined): string | undefined {
  const title = value?.trim();
  if (!title) {
    return fallback;
  }

  return title.slice(0, maxWidgetTitleLength);
}

function renderWidgetMarkdown(value: string): string {
  const lines = value.split(/\r?\n/);
  const blocks: string[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length === 0) {
      return;
    }

    blocks.push(`<ul>${listItems.join("")}</ul>`);
    listItems = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      continue;
    }

    if (trimmed.startsWith("- ")) {
      listItems.push(`<li>${renderInlineMarkdown(trimmed.slice(2))}</li>`);
      continue;
    }

    flushList();
    blocks.push(`<p>${renderInlineMarkdown(trimmed)}</p>`);
  }

  flushList();
  return blocks.join("") || `<p>${renderInlineMarkdown(value)}</p>`;
}

function renderInlineMarkdown(value: string): string {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function normalizeWidgetModes(value: WidgetMode[] | undefined): WidgetMode[] {
  const modes = value?.filter((mode): mode is WidgetMode => mode === "comment" || mode === "pin" || mode === "screenshot") ?? defaultWidgetModes;
  const uniqueModes = defaultWidgetModes.filter((mode) => modes.includes(mode));
  return uniqueModes.length > 0 ? uniqueModes : defaultWidgetModes;
}

function parseWidgetModes(value: string | undefined): WidgetMode[] | undefined {
  if (!value) {
    return undefined;
  }

  return normalizeWidgetModes(value.split(",").map((mode) => mode.trim()) as WidgetMode[]);
}

function isModeEnabled(mode: FeedbackType, modes: readonly WidgetMode[]): boolean {
  return modes.includes(mode as WidgetMode);
}
