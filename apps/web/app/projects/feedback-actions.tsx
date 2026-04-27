"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { FeedbackStatus } from "@changethis/shared";

type Props = {
  feedbackId: string;
  status: FeedbackStatus;
  externalIssueUrl?: string;
};

export function FeedbackActions({ feedbackId, status, externalIssueUrl }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  function run(path: string) {
    startTransition(async () => {
      setError(undefined);

      try {
        const response = await fetch(path, { method: "POST" });

        if (!response.ok) {
          setError("Action impossible pour le moment. Reessayez dans quelques secondes.");
          return;
        }

        router.refresh();
      } catch {
        setError("Connexion interrompue. Verifiez le serveur local puis reessayez.");
      }
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
      {error ? <span className="action-error" role="alert">{error}</span> : null}
    </div>
  );
}
