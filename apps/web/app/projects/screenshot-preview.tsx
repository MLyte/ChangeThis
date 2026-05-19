"use client";

import Image from "next/image";
import { Eye, X } from "lucide-react";
import { useId, useState } from "react";
import type { FeedbackMetadata, FeedbackStatus, FeedbackType, IssueProvider, PinTarget } from "@changethis/shared";
import type { StoredAsset } from "../../lib/feedback-repository";
import { T } from "../i18n";
import { ProviderBadge } from "../provider-badge";

type Props = {
  asset: StoredAsset;
  feedback: {
    createdAt: string;
    issueTarget: {
      namespace: string;
      project: string;
      provider: IssueProvider;
      webUrl?: string;
    };
    message: string;
    projectName: string;
    status: FeedbackStatus;
    title: string;
    type: FeedbackType;
  };
  metadata: FeedbackMetadata;
  pin?: PinTarget;
  pins?: PinTarget[];
};

export function ScreenshotPreview({ asset, feedback, metadata, pin, pins }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const titleId = useId();
  const sizeKo = Math.round(asset.bytes / 1024);
  const assetStatus = asset.status ?? "active";
  const previewUrl = asset.thumbnailDataUrl ?? asset.dataUrl;
  const fullImageUrl = asset.dataUrl ?? asset.thumbnailDataUrl;
  const viewport = `${metadata.viewport.width} x ${metadata.viewport.height}`;
  const deviceContext = formatDeviceContext(metadata);
  const browserContext = formatBrowserContext(metadata.userAgent);
  const isMobileCapture = metadata.viewport.width < 700 && metadata.viewport.height > metadata.viewport.width;
  const pinPositions = (pins?.length ? pins : pin ? [pin] : []).map((item) => pinImagePosition(item, metadata));
  const modalImageSize = displayImageSize(metadata.viewport, feedback.type);

  if (!previewUrl || !fullImageUrl) {
    return null;
  }

  return (
    <>
      <button
        aria-label="Voir la capture"
        className="screenshot-thumb"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <span className="screenshot-image-wrap">
          <Image
            alt=""
            height={72}
            src={previewUrl}
            unoptimized
            width={112}
          />
          {pinPositions.map((position, index) => (
            <span className="screenshot-pin" key={index} style={position}>{index + 1}</span>
          ))}
          <span className="screenshot-thumb-overlay" aria-hidden="true">
            <Eye className="ui-icon" size={20} strokeWidth={2.4} />
          </span>
        </span>
      </button>

      {isOpen ? (
        <div
          aria-labelledby={titleId}
          aria-modal="true"
          className="screenshot-modal"
          role="dialog"
        >
          <button
            aria-label="Fermer"
            className="screenshot-modal-backdrop"
            onClick={() => setIsOpen(false)}
            type="button"
          />
          <div className={`screenshot-modal-panel${isMobileCapture ? " mobile-capture" : ""}`}>
            <div className="screenshot-modal-header">
              <h2 id={titleId}><T k="projects.feedback.capture" /></h2>
              <button
                className="button secondary-button"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <X aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
                <T k="actions.close" />
              </button>
            </div>
            <div className="screenshot-modal-body">
              <div className="screenshot-modal-image-wrap">
                <Image
                  alt=""
                  className="screenshot-modal-image"
                  height={modalImageSize.height}
                  src={fullImageUrl}
                  unoptimized
                  width={modalImageSize.width}
                />
                {pinPositions.map((position, index) => (
                  <span className="screenshot-pin large" key={index} style={position}>{index + 1}</span>
                ))}
              </div>
              <aside className="screenshot-modal-sidebar" aria-label="Informations du feedback">
                <div>
                  <span className="status-badge needs_setup"><T k={`status.${feedback.status}`} /></span>
                  <ProviderBadge provider={feedback.issueTarget.provider} />
                </div>
                <section>
                  <p className="eyebrow">Feedback</p>
                  <h3>{feedback.title}</h3>
                  <p className="feedback-message">{feedback.message || <T k="projects.feedback.noMessage" />}</p>
                </section>
                <dl className="feedback-detail-list">
                  <div>
                    <dt>Site</dt>
                    <dd>{feedback.projectName}</dd>
                  </div>
                  <div>
                    <dt>Page</dt>
                    <dd>{metadata.path}</dd>
                  </div>
                  <div>
                    <dt>Viewport</dt>
                    <dd>{viewport}</dd>
                  </div>
                  <div>
                    <dt>Écran</dt>
                    <dd>{deviceContext}</dd>
                  </div>
                  {browserContext ? (
                    <div>
                      <dt>Navigateur</dt>
                      <dd>{browserContext}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt>URL</dt>
                    <dd>
                      <a className="inline-link" href={metadata.url}>{metadata.url}</a>
                    </dd>
                  </div>
                  <div>
                    <dt>Reçu</dt>
                    <dd>{formatDate(feedback.createdAt)}</dd>
                  </div>
                  <div>
                    <dt>Destination</dt>
                    <dd>
                      {feedback.issueTarget.webUrl ? (
                        <a className="inline-link" href={feedback.issueTarget.webUrl}>{feedback.issueTarget.namespace}/{feedback.issueTarget.project}</a>
                      ) : (
                        `${feedback.issueTarget.namespace}/${feedback.issueTarget.project}`
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Fichier</dt>
                    <dd>{asset.mimeType} - {sizeKo} Ko - {assetStatus}</dd>
                  </div>
                </dl>
              </aside>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function pinImagePosition(pin: PinTarget, metadata: FeedbackMetadata): { left: string; top: string } {
  const scroll = metadata.scroll ?? { x: 0, y: 0 };
  const x = ((pin.x - scroll.x) / metadata.viewport.width) * 100;
  const y = ((pin.y - scroll.y) / metadata.viewport.height) * 100;

  return {
    left: `${clamp(x, 0, 100)}%`,
    top: `${clamp(y, 0, 100)}%`
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function displayImageSize(viewport: FeedbackMetadata["viewport"], type: FeedbackType): { width: number; height: number } {
  const maxWidth = type === "comment" ? 960 : 1600;
  const width = Math.max(1, Math.round(Math.min(viewport.width, maxWidth)));
  const scale = width / Math.max(1, viewport.width);
  const height = Math.max(1, Math.round(viewport.height * scale));

  return { width, height };
}

function formatDeviceContext(metadata: FeedbackMetadata): string {
  const { height, width } = metadata.viewport;
  const deviceLabel = inferDeviceLabel(width, height, metadata.userAgent);
  const orientation = height >= width ? "portrait" : "paysage";
  const ratio = Number.isFinite(metadata.devicePixelRatio) && metadata.devicePixelRatio > 0
    ? ` · DPR ${formatCompactNumber(metadata.devicePixelRatio)}`
    : "";
  const screen = metadata.screen?.width && metadata.screen?.height
    ? ` · écran ${metadata.screen.width} x ${metadata.screen.height}`
    : "";

  return `${deviceLabel} ${orientation} · viewport ${width} x ${height}${ratio}${screen}`;
}

function inferDeviceLabel(width: number, height: number, userAgent: string): string {
  const shortSide = Math.min(width, height);
  const longSide = Math.max(width, height);

  if (/\biPad\b/i.test(userAgent)) {
    return "iPad";
  }

  if (/\biPhone\b|\biPod\b/i.test(userAgent)) {
    return "Mobile iPhone";
  }

  if (/Android/i.test(userAgent) && !/Mobile/i.test(userAgent)) {
    return "Tablette Android";
  }

  if (/Mobile|Android|Windows Phone/i.test(userAgent) || shortSide < 700) {
    return "Mobile";
  }

  if (shortSide < 1024 && longSide < 1400) {
    return "Tablette";
  }

  return "Desktop";
}

function formatBrowserContext(userAgent: string): string | undefined {
  const browser = inferBrowserLabel(userAgent);
  const os = inferOperatingSystemLabel(userAgent);

  if (!browser && !os) {
    return undefined;
  }

  return [browser, os].filter(Boolean).join(" · ");
}

function inferBrowserLabel(userAgent: string): string | undefined {
  if (/Edg\//i.test(userAgent)) {
    return "Edge";
  }

  if (/OPR\//i.test(userAgent)) {
    return "Opera";
  }

  if (/SamsungBrowser\//i.test(userAgent)) {
    return "Samsung Internet";
  }

  if (/CriOS\//i.test(userAgent)) {
    return "Chrome iOS";
  }

  if (/Chrome\//i.test(userAgent)) {
    return "Chrome";
  }

  if (/FxiOS\//i.test(userAgent)) {
    return "Firefox iOS";
  }

  if (/Firefox\//i.test(userAgent)) {
    return "Firefox";
  }

  if (/Version\/.+Safari\//i.test(userAgent)) {
    return "Safari";
  }

  return undefined;
}

function inferOperatingSystemLabel(userAgent: string): string | undefined {
  if (/\biPad\b/i.test(userAgent)) {
    return "iPadOS";
  }

  if (/\biPhone\b|\biPod\b/i.test(userAgent)) {
    return "iOS";
  }

  if (/Android/i.test(userAgent)) {
    return "Android";
  }

  if (/Windows NT/i.test(userAgent)) {
    return "Windows";
  }

  if (/Mac OS X|Macintosh/i.test(userAgent)) {
    return "macOS";
  }

  if (/Linux/i.test(userAgent)) {
    return "Linux";
  }

  return undefined;
}

function formatCompactNumber(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("fr-BE", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "2-digit"
  }).format(new Date(value));
}
