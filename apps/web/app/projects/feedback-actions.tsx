"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Archive, ExternalLink, RotateCcw, Send, BookmarkCheck } from "lucide-react";
import type { FeedbackStatus, IssueDraft } from "@changethis/shared";
import { T, useLanguage } from "../i18n";

type Props = {
  feedbackId: string;
  issueDraft: IssueDraft;
  status: FeedbackStatus;
  externalIssueUrl?: string;
};

export function FeedbackActions({ feedbackId, issueDraft, status, externalIssueUrl }: Props) {
  const { t } = useLanguage();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState(issueDraft.title);
  const [draftDescription, setDraftDescription] = useState(issueDraft.description);
  const [draftLabels, setDraftLabels] = useState(issueDraft.labels.join(", "));

  useEffect(() => {
    setDraftTitle(issueDraft.title);
    setDraftDescription(issueDraft.description);
    setDraftLabels(issueDraft.labels.join(", "));
  }, [issueDraft]);

  function run(
    path: string,
    action: "issue" | "ignore" | "keep" | "sync",
    payload?: unknown,
    onSuccess?: () => void
  ) {
    startTransition(async () => {
      setError(undefined);

      try {
        const response = await fetch(path, {
          body: payload ? JSON.stringify(payload) : undefined,
          headers: payload ? { "content-type": "application/json" } : undefined,
          method: "POST"
        });
        const body = await response.json().catch(() => undefined) as {
          status?: FeedbackStatus;
          externalIssue?: { url?: string };
          lastError?: string;
          nextRetryAt?: string;
          error?: string;
        } | undefined;

        if (!response.ok) {
          const message = body?.error ?? t("actions.error.impossible");
          setError(message);
          toast.error(action === "issue" ? "Issue non créée" : "Action impossible", {
            description: message
          });
          return;
        }

        if (action === "ignore") {
          toast.success("Retour archivé", {
            description: "Il reste disponible dans l'historique, mais sort de la file active."
          });
        } else if (action === "keep") {
          toast.success("Feedback conservé", {
            description: "Il sort de la priorité sans créer d'issue."
          });
        } else if (action === "sync") {
          toast.success(body?.status === "resolved" ? "Issue résolue" : "Issue toujours ouverte", {
            description: body?.status === "resolved" ? "Le feedback est placé dans les résolus." : "Le feedback reste lié à son issue."
          });
        } else if (body?.status === "sent_to_provider") {
          toast.success("Issue créée", {
            description: body.externalIssue?.url ? "Le retour est maintenant lié au dépôt Git." : "Le retour a été envoyé au provider Git."
          });
        } else if (body?.status === "retrying") {
          toast.warning("Création reportée", {
            description: body.lastError ?? "ChangeThis retentera la création de l'issue automatiquement."
          });
        } else if (body?.status === "failed") {
          toast.error("Création échouée", {
            description: body.lastError ?? "Vérifiez la connexion Git ou les permissions du dépôt."
          });
        } else {
          toast.success("Action effectuée");
        }

        onSuccess?.();
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : t("actions.error.connection");
        setError(message);
        toast.error("Connexion interrompue", {
          description: message
        });
      }
    });
  }

  function createIssueFromDraft() {
    const labels = draftLabels
      .split(",")
      .map((label) => label.trim())
      .filter(Boolean);

    run(
      `/api/projects/feedbacks/${feedbackId}/issue`,
      "issue",
      {
        issueDraft: {
          description: draftDescription.trim(),
          labels,
          title: draftTitle.trim()
        }
      },
      () => setIsComposerOpen(false)
    );
  }

  function ignoreFeedback() {
    const confirmed = window.confirm("Ignorer ce feedback ? Il sortira de la file active, mais restera disponible dans l'historique.");

    if (!confirmed) {
      return;
    }

    run(`/api/projects/feedbacks/${feedbackId}/ignore`, "ignore");
  }

  if ((status === "sent_to_provider" || status === "resolved") && externalIssueUrl) {
    return (
      <div className="feedback-actions">
        <a className="button" href={externalIssueUrl} rel="noreferrer" target="_blank">
          <ExternalLink aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
          <T k="actions.issue.view" />
        </a>
        {status === "sent_to_provider" ? (
          <details className="feedback-action-menu">
            <summary className="button secondary-button">Plus</summary>
            <div className="feedback-action-menu-panel">
              <button
                className="button secondary-button"
                disabled={isPending}
                onClick={() => run(`/api/projects/feedbacks/${feedbackId}/sync`, "sync")}
                type="button"
              >
                <RotateCcw aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
                {isPending ? <T k="actions.processing" /> : <T k="actions.issue.sync" />}
              </button>
            </div>
          </details>
        ) : null}
      </div>
    );
  }

  if (status === "ignored" || status === "kept") {
    return (
      <div className="feedback-actions">
        <span className="button secondary-button disabled-button"><T k={status === "kept" ? "actions.kept" : "actions.ignored"} /></span>
      </div>
    );
  }

  const createLabelKey = status === "retrying" || status === "failed" ? "actions.replay" : "actions.create";
  const canCreateIssue = draftTitle.trim().length > 0 && draftDescription.trim().length > 0;

  return (
    <div className="feedback-actions">
      <button
        className="button"
        disabled={isPending}
        onClick={() => setIsComposerOpen(true)}
        type="button"
      >
        {isPending ? null : createLabelKey === "actions.replay" ? (
          <RotateCcw aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
        ) : (
          <Send aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
        )}
        {isPending ? <T k="actions.processing" /> : <T k={createLabelKey} />}
      </button>
      <details className="feedback-action-menu">
        <summary className="button secondary-button">Plus</summary>
        <div className="feedback-action-menu-panel">
          <button
            className="button secondary-button"
            disabled={isPending}
            onClick={() => run(`/api/projects/feedbacks/${feedbackId}/keep`, "keep")}
            type="button"
          >
            <BookmarkCheck aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
            <T k="actions.keepFeedback" />
          </button>
          <button
            className="button danger-button"
            disabled={isPending}
            onClick={ignoreFeedback}
            type="button"
          >
            <Archive aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
            <T k="actions.ignore" />
          </button>
        </div>
      </details>
      {error ? <span className="action-error" role="alert">{error}</span> : null}
      {isComposerOpen ? (
        <div className="issue-composer" role="dialog" aria-modal="true" aria-labelledby={`issue-composer-${feedbackId}`}>
          <button
            aria-label={t("issueComposer.cancel")}
            className="issue-composer-backdrop"
            onClick={() => setIsComposerOpen(false)}
            type="button"
          />
          <section className="issue-composer-panel">
            <div className="issue-composer-header">
              <div>
                <p className="eyebrow"><T k="projects.feedback.draft" /></p>
                <h2 id={`issue-composer-${feedbackId}`}><T k="issueComposer.title" /></h2>
              </div>
              <button className="button secondary-button" onClick={() => setIsComposerOpen(false)} type="button">
                <T k="issueComposer.cancel" />
              </button>
            </div>
            <p className="issue-composer-copy"><T k="issueComposer.copy" /></p>
            <div className="issue-composer-form">
              <label className="issue-composer-field">
                <span><T k="issueComposer.issueTitle" /></span>
                <input
                  maxLength={240}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  value={draftTitle}
                />
              </label>
              <label className="issue-composer-field">
                <span><T k="issueComposer.description" /></span>
                <textarea
                  maxLength={12000}
                  onChange={(event) => setDraftDescription(event.target.value)}
                  value={draftDescription}
                />
              </label>
              <label className="issue-composer-field">
                <span><T k="issueComposer.labels" /></span>
                <input
                  onChange={(event) => setDraftLabels(event.target.value)}
                  value={draftLabels}
                />
                <small><T k="issueComposer.labelsHint" /></small>
              </label>
            </div>
            <div className="issue-composer-actions">
              {error ? <span className="action-error" role="alert">{error}</span> : null}
              <button className="button secondary-button" onClick={() => setIsComposerOpen(false)} type="button">
                <T k="issueComposer.cancel" />
              </button>
              <button className="button" disabled={isPending || !canCreateIssue} onClick={createIssueFromDraft} type="button">
                {isPending ? <T k="actions.processing" /> : <T k="issueComposer.submit" />}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
