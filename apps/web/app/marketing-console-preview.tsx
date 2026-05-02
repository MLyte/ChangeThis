"use client";

import {
  Archive,
  Camera,
  CheckCircle2,
  Code2,
  GitBranch,
  GitPullRequestCreate,
  Inbox,
  MapPin,
  MessageSquare,
  Send,
  Settings2
} from "lucide-react";
import { useLanguage } from "./i18n";
import { ProviderBadge } from "./provider-badge";

const feedbackItems = [
  {
    titleKey: "home.loop.feedback.1.title",
    copyKey: "home.loop.feedback.1.copy",
    metaKey: "home.loop.feedback.1.meta",
    Icon: MapPin
  },
  {
    titleKey: "home.loop.feedback.2.title",
    copyKey: "home.loop.feedback.2.copy",
    metaKey: "home.loop.feedback.2.meta",
    Icon: Camera
  },
  {
    titleKey: "home.loop.feedback.3.title",
    copyKey: "home.loop.feedback.3.copy",
    metaKey: "home.loop.feedback.3.meta",
    Icon: MessageSquare
  }
];

export function MarketingConsolePreview() {
  const { t } = useLanguage();

  return (
    <div className="product-loop-preview" aria-label={t("home.loop.aria")}>
      <div className="product-loop-board">
        <section className="loop-panel loop-setup-panel" aria-labelledby="preview-setup-title">
          <div className="loop-panel-heading">
            <div>
              <p className="eyebrow">{t("home.loop.setup.eyebrow")}</p>
              <h2 id="preview-setup-title">{t("home.loop.setup.title")}</h2>
            </div>
          </div>

          <div className="loop-panel-visual">
            <div className="loop-script-card" aria-label={t("home.loop.script.aria")}>
              <div className="loop-script-card-bar">
                <Code2 aria-hidden="true" size={15} strokeWidth={2.2} />
                <span>client-site.dev</span>
              </div>
              <code>{`<script src="https://app.changethis.dev/widget.js"
  data-project="cabinet-orion">
</script>`}</code>
            </div>

            <div className="loop-git-config-card">
              <div className="loop-git-config-header">
                <Settings2 aria-hidden="true" size={16} strokeWidth={2.2} />
                <strong>{t("home.loop.git.title")}</strong>
              </div>
              <div className="loop-git-provider-row">
                <ProviderBadge provider="github" />
                <span>cabinet-orion/booking-portal</span>
                <CheckCircle2 aria-hidden="true" size={15} strokeWidth={2.2} />
              </div>
              <div className="loop-git-provider-row">
                <ProviderBadge provider="gitlab" />
                <span>studio-lumen/shopfront</span>
                <CheckCircle2 aria-hidden="true" size={15} strokeWidth={2.2} />
              </div>
            </div>
          </div>
        </section>

        <section className="loop-panel loop-visitor-panel" aria-labelledby="preview-visitor-title">
          <div className="loop-panel-heading">
            <div>
              <p className="eyebrow">{t("home.loop.visitor.eyebrow")}</p>
              <h2 id="preview-visitor-title">{t("home.loop.visitor.title")}</h2>
            </div>
          </div>

          <div className="loop-panel-visual loop-site-feedback-stage" aria-hidden="true">
            <div className="loop-fake-site-header">
              <span />
              <span />
              <span />
            </div>
            <div className="loop-fake-site-hero">
              <strong>{t("home.loop.fakeSite.title")}</strong>
              <span>{t("home.loop.fakeSite.subtitle")}</span>
            </div>
            <div className="loop-fake-site-grid">
              <span />
              <span />
              <span />
            </div>
            <span className="loop-feedback-pin">1</span>
            <div className="loop-feedback-widget-card">
              <div className="loop-feedback-widget-tabs">
                <span>{t("home.loop.widget.note")}</span>
                <span className="active">{t("home.loop.widget.marker")}</span>
                <span>{t("home.loop.widget.capture")}</span>
              </div>
              <p>{t("home.loop.widget.copy")}</p>
              <button type="button">
                <Send aria-hidden="true" size={13} strokeWidth={2.2} />
                {t("home.loop.widget.send")}
              </button>
            </div>
          </div>
        </section>

        <section className="loop-panel loop-developer-panel" aria-labelledby="preview-developer-title">
          <div className="loop-panel-heading">
            <div>
              <p className="eyebrow">{t("home.loop.developer.eyebrow")}</p>
              <h2 id="preview-developer-title">{t("home.loop.developer.title")}</h2>
            </div>
          </div>

          <div className="loop-panel-visual developer-inbox-card">
            <div className="developer-inbox-toolbar">
              <span>
                <Inbox aria-hidden="true" size={15} strokeWidth={2.2} />
                {t("home.loop.inbox.active")}
              </span>
              <strong>3</strong>
            </div>

            <div className="developer-feedback-list">
              {feedbackItems.map(({ titleKey, copyKey, metaKey, Icon }, index) => (
                <article className={index === 0 ? "developer-feedback-item active" : "developer-feedback-item"} key={titleKey}>
                  <Icon aria-hidden="true" size={16} strokeWidth={2.2} />
                  <div>
                    <strong>{t(titleKey)}</strong>
                    <span>{t(copyKey)}</span>
                  </div>
                  <em>{t(metaKey)}</em>
                </article>
              ))}
            </div>

            <div className="developer-decision-card">
              <div>
                <GitBranch aria-hidden="true" size={16} strokeWidth={2.2} />
                <span>cabinet-orion/booking-portal</span>
              </div>
              <div className="loop-developer-actions">
                <span className="button dashboard-preview-action">
                  <GitPullRequestCreate aria-hidden="true" size={14} strokeWidth={2.2} />
                  {t("home.loop.actions.task")}
                </span>
                <span className="button secondary-button dashboard-preview-action">
                  <Archive aria-hidden="true" size={14} strokeWidth={2.2} />
                  {t("home.loop.actions.archive")}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
