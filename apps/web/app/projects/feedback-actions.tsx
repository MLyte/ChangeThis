"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Archive, ExternalLink, RotateCcw, Send, BookmarkCheck } from "lucide-react";
import type { FeedbackStatus } from "@changethis/shared";
import { T, useLanguage } from "../i18n";

type Props = {
  feedbackId: string;
  status: FeedbackStatus;
  externalIssueUrl?: string;
};

export function FeedbackActions({ feedbackId, status, externalIssueUrl }: Props) {
  const { t } = useLanguage();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  function run(path: string, action: "issue" | "ignore" | "keep" | "sync") {
    startTransition(async () => {
      setError(undefined);

      try {
        const response = await fetch(path, { method: "POST" });
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

  if ((status === "sent_to_provider" || status === "resolved") && externalIssueUrl) {
    return (
      <div className="feedback-actions">
        <a className="button" href={externalIssueUrl} rel="noreferrer" target="_blank">
          <ExternalLink aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
          <T k="actions.issue.view" />
        </a>
        {status === "sent_to_provider" ? (
          <button
            className="button secondary-button"
            disabled={isPending}
            onClick={() => run(`/api/projects/feedbacks/${feedbackId}/sync`, "sync")}
            type="button"
          >
            <RotateCcw aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
            {isPending ? <T k="actions.processing" /> : <T k="actions.issue.sync" />}
          </button>
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

  return (
    <div className="feedback-actions">
      <button
        className="button"
        disabled={isPending}
        onClick={() => run(`/api/projects/feedbacks/${feedbackId}/issue`, "issue")}
        type="button"
      >
        {isPending ? null : createLabelKey === "actions.replay" ? (
          <RotateCcw aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
        ) : (
          <Send aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
        )}
        {isPending ? <T k="actions.processing" /> : <T k={createLabelKey} />}
      </button>
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
        className="button secondary-button"
        disabled={isPending}
        onClick={() => run(`/api/projects/feedbacks/${feedbackId}/ignore`, "ignore")}
        type="button"
      >
        <Archive aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
        <T k="actions.ignore" />
      </button>
      {error ? <span className="action-error" role="alert">{error}</span> : null}
    </div>
  );
}
