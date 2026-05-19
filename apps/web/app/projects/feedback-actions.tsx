"use client";

import { useRouter } from "next/navigation";
import { type ChangeEvent, useState, useTransition } from "react";
import { toast } from "sonner";
import { Archive, ExternalLink, RotateCcw, Send } from "lucide-react";
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
  const [isIgnoreConfirmOpen, setIsIgnoreConfirmOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState(issueDraft.title);
  const [draftDescription, setDraftDescription] = useState(issueDraft.description);
  const [draftLabels, setDraftLabels] = useState(issueDraft.labels.join(", "));

  function openComposer() {
    setDraftTitle(issueDraft.title);
    setDraftDescription(issueDraft.description);
    setDraftLabels(issueDraft.labels.join(", "));
    setIsComposerOpen(true);
  }

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
    setIsIgnoreConfirmOpen(false);
    run(`/api/projects/feedbacks/${feedbackId}/ignore`, "ignore");
  }

  function handleMoreAction(event: ChangeEvent<HTMLSelectElement>) {
    const action = event.currentTarget.value;
    event.currentTarget.value = "";

    if (isPending || action === "") {
      return;
    }

    if (action === "sync") {
      run(`/api/projects/feedbacks/${feedbackId}/sync`, "sync");
      return;
    }

    if (action === "keep") {
      run(`/api/projects/feedbacks/${feedbackId}/keep`, "keep");
      return;
    }

    if (action === "ignore") {
      setIsIgnoreConfirmOpen(true);
    }
  }

  if ((status === "sent_to_provider" || status === "resolved") && externalIssueUrl) {
    return (
      <div className="feedback-actions">
        <a className="button" href={externalIssueUrl} rel="noreferrer" target="_blank">
          <ExternalLink aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
          <T k="actions.issue.view" />
        </a>
        {status === "sent_to_provider" ? (
          <select
            aria-label="Actions"
            className="feedback-action-select"
            disabled={isPending}
            defaultValue=""
            onChange={handleMoreAction}
          >
            <option disabled value="">
              Plus
            </option>
            <option value="sync">
              {isPending ? t("actions.processing") : t("actions.issue.sync")}
            </option>
          </select>
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
  const isReplayAction = createLabelKey === "actions.replay";
  const canCreateIssue = draftTitle.trim().length > 0 && draftDescription.trim().length > 0;

  return (
    <div className="feedback-actions">
      <button
        className={isReplayAction ? "button retry-batch-button" : "button"}
        disabled={isPending}
        onClick={openComposer}
        type="button"
      >
        {isPending ? null : isReplayAction ? (
          <RotateCcw aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
        ) : (
          <Send aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
        )}
        {isPending ? <T k="actions.processing" /> : <T k={createLabelKey} />}
      </button>
      <select
        aria-label="Actions"
        className="feedback-action-select"
        disabled={isPending}
        defaultValue=""
        onChange={handleMoreAction}
      >
        <option disabled value="">
          Plus
        </option>
        <option value="keep">
          <T k="actions.keepFeedback" />
        </option>
        <option value="ignore">
          <T k="actions.ignore" />
        </option>
      </select>
      {error ? <span className="action-error" role="alert">{error}</span> : null}
      {isIgnoreConfirmOpen ? (
        <FeedbackIgnoreConfirmationModal
          isPending={isPending}
          onCancel={() => setIsIgnoreConfirmOpen(false)}
          onConfirm={ignoreFeedback}
        />
      ) : null}
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

function FeedbackIgnoreConfirmationModal({
  isPending,
  onCancel,
  onConfirm
}: {
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="ignore-feedback-title">
      <button className="settings-modal-backdrop" aria-label="Annuler" onClick={onCancel} type="button" />
      <div className="settings-modal-panel confirmation-modal-panel">
        <div className="confirmation-modal-icon" aria-hidden="true">
          <Archive className="ui-icon" size={22} strokeWidth={2.2} />
        </div>
        <div className="confirmation-modal-content">
          <p className="eyebrow">Archivage</p>
          <h2 id="ignore-feedback-title">Ignorer ce feedback ?</h2>
          <p>
            Il sortira de la file active, mais restera disponible dans l&apos;historique.
          </p>
        </div>
        <div className="confirmation-modal-actions">
          <button className="button secondary-button" disabled={isPending} onClick={onCancel} type="button">
            Annuler
          </button>
          <button className="button" disabled={isPending} onClick={onConfirm} type="button">
            {isPending ? "Archivage..." : "Ignorer"}
          </button>
        </div>
      </div>
    </div>
  );
}
