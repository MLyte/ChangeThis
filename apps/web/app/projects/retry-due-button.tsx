"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { T } from "../i18n";

export function RetryDueButton({ count }: { count: number }) {
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
          toast.error("Réessai impossible", {
            description: body?.error ?? "Les créations d'issues en attente n'ont pas pu être réessayées."
          });
          return;
        }

        const processed = body?.processed ?? 0;
        toast.success(processed > 0 ? "Créations d'issues réessayées" : "Aucune issue à réessayer", {
          description: processed > 0
            ? `${processed} retour${processed > 1 ? "s" : ""} traité${processed > 1 ? "s" : ""}.`
            : "Aucun feedback en échec n'était prêt pour une nouvelle tentative."
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
    <button className="button retry-batch-button" disabled={isPending} onClick={retryDueFeedbacks} type="button">
      {isPending ? <T k="actions.processing" /> : <><T k="projects.inbox.retryDue" /> ({count})</>}
    </button>
  );
}
