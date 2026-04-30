"use client";

import Image from "next/image";
import { Eye, X } from "lucide-react";
import { useId, useState } from "react";
import type { FeedbackMetadata, PinTarget } from "@changethis/shared";
import type { StoredAsset } from "../../lib/feedback-repository";
import { T } from "../i18n";

type Props = {
  asset: StoredAsset;
  metadata: FeedbackMetadata;
  pin?: PinTarget;
  pins?: PinTarget[];
};

export function ScreenshotPreview({ asset, metadata, pin, pins }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const titleId = useId();
  const sizeKo = Math.round(asset.bytes / 1024);
  const pinPositions = (pins?.length ? pins : pin ? [pin] : []).map((item) => pinImagePosition(item, metadata));

  return (
    <>
      <button
        className="screenshot-thumb"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <span className="screenshot-image-wrap">
          <Image
            alt=""
            height={72}
            src={asset.dataUrl}
            unoptimized
            width={112}
          />
          {pinPositions.map((position, index) => (
            <span className="screenshot-pin" key={index} style={position}>{index + 1}</span>
          ))}
        </span>
        <span className="screenshot-thumb-overlay" aria-hidden="true">
          <Eye className="ui-icon" size={20} strokeWidth={2.4} />
        </span>
        <span className="screenshot-thumb-label">
          <T k="projects.feedback.capture" /> - {sizeKo} Ko
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
          <div className="screenshot-modal-panel">
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
            <div className="screenshot-modal-image-wrap">
              <Image
                alt=""
                className="screenshot-modal-image"
                height={1080}
                src={asset.dataUrl}
                unoptimized
                width={1920}
              />
              {pinPositions.map((position, index) => (
                <span className="screenshot-pin large" key={index} style={position}>{index + 1}</span>
              ))}
            </div>
            <p>{asset.mimeType} - {sizeKo} Ko</p>
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
