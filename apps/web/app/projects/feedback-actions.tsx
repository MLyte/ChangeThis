"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Archive, ExternalLink, RotateCcw, Send } from "lucide-react";
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

  function run(path: string) {
    startTransition(async () => {
      setError(undefined);

      try {
        const response = await fetch(path, { method: "POST" });

        if (!response.ok) {
          setError(t("actions.error.impossible"));
          return;
        }

        router.refresh();
      } catch {
        setError(t("actions.error.connection"));
      }
    });
  }

  if (status === "sent_to_provider" && externalIssueUrl) {
    return (
      <div className="feedback-actions">
        <a className="button" href={externalIssueUrl}>
          <ExternalLink aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
          <T k="actions.issue.view" />
        </a>
      </div>
    );
  }

  if (status === "ignored") {
    return (
      <div className="feedback-actions">
        <span className="button secondary-button disabled-button"><T k="actions.ignored" /></span>
      </div>
    );
  }

  const createLabelKey = status === "retrying" || status === "failed" ? "actions.replay" : "actions.create";

  return (
    <div className="feedback-actions">
      <button
        className="button"
        disabled={isPending}
        onClick={() => run(`/api/projects/feedbacks/${feedbackId}/issue`)}
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
        onClick={() => run(`/api/projects/feedbacks/${feedbackId}/ignore`)}
        type="button"
      >
        <Archive aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
        <T k="actions.ignore" />
      </button>
      {error ? <span className="action-error" role="alert">{error}</span> : null}
    </div>
  );
}
