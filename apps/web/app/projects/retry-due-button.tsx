"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { T } from "../i18n";

export function RetryDueButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function retryDueFeedbacks() {
    startTransition(async () => {
      try {
        const response = await fetch("/api/projects/retries", {
          method: "POST",
          headers: {
            Accept: "application/json"
          }
        });
        const body = await response.json().catch(() => undefined) as { processed?: number; error?: string } | undefined;

        if (!response.ok) {
          toast.error("Relance impossible", {
            description: body?.error ?? "Les relances dues n'ont pas pu être rejouées."
          });
          return;
        }

        const processed = body?.processed ?? 0;
        toast.success(processed > 0 ? "Relances rejouées" : "Aucune relance due", {
          description: processed > 0
            ? `${processed} retour${processed > 1 ? "s" : ""} traité${processed > 1 ? "s" : ""}.`
            : "Aucun retour n'était prêt à être relancé."
        });
        router.refresh();
      } catch (error) {
        toast.error("Connexion interrompue", {
          description: error instanceof Error ? error.message : "Vérifiez le serveur local puis réessayez."
        });
      }
    });
  }

  return (
    <button className="button secondary-button" disabled={isPending} onClick={retryDueFeedbacks} type="button">
      {isPending ? <T k="actions.processing" /> : <T k="projects.inbox.retryDue" />}
    </button>
  );
}
