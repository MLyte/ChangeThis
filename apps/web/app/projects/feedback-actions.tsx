"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { FeedbackStatus } from "@changethis/shared";

type Props = {
  feedbackId: string;
  status: FeedbackStatus;
  externalIssueUrl?: string;
};

export function FeedbackActions({ feedbackId, status, externalIssueUrl }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function run(path: string) {
    startTransition(async () => {
      await fetch(path, { method: "POST" });
      router.refresh();
    });
  }

  if (status === "sent_to_provider" && externalIssueUrl) {
    return (
      <div className="feedback-actions">
        <a className="button" href={externalIssueUrl}>
          Voir l&apos;issue
        </a>
      </div>
    );
  }

  if (status === "ignored") {
    return (
      <div className="feedback-actions">
        <span className="button secondary-button disabled-button">Ignore</span>
      </div>
    );
  }

  const createLabel = status === "retrying" || status === "failed" ? "Rejouer" : "Creer l'issue";

  return (
    <div className="feedback-actions">
      <button
        className="button"
        disabled={isPending}
        onClick={() => run(`/api/projects/feedbacks/${feedbackId}/issue`)}
        type="button"
      >
        {isPending ? "Traitement..." : createLabel}
      </button>
      <button
        className="button secondary-button"
        disabled={isPending}
        onClick={() => run(`/api/projects/feedbacks/${feedbackId}/ignore`)}
        type="button"
      >
        Ignorer
      </button>
    </div>
  );
}
