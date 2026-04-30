"use client";

import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useState, useTransition } from "react";
import { toast } from "sonner";

export function BulkIssueForm({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [selectedCount, setSelectedCount] = useState(0);
  const [isPending, startTransition] = useTransition();

  function updateSelectedCount(form: HTMLFormElement) {
    setSelectedCount(form.querySelectorAll<HTMLInputElement>("input[name='feedbackId']:checked").length);
  }

  function createSelectedIssues(formData: FormData) {
    const feedbackIds = formData.getAll("feedbackId").filter((value): value is string => typeof value === "string");

    if (feedbackIds.length === 0) {
      toast.info("Sélectionnez au moins un feedback", {
        description: "Cochez les feedbacks que vous voulez transformer en issues."
      });
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/projects/feedbacks/bulk-issue", {
          body: JSON.stringify({ feedbackIds }),
          headers: {
            "content-type": "application/json"
          },
          method: "POST"
        });
        const body = await response.json().catch(() => undefined) as {
          created?: number;
          failed?: number;
          skipped?: number;
          error?: string;
        } | undefined;

        if (!response.ok) {
          toast.error("Création par lot impossible", {
            description: body?.error ?? "Les issues sélectionnées n'ont pas pu être créées."
          });
          return;
        }

        toast.success("Création par lot terminée", {
          description: `${body?.created ?? 0} créée(s), ${body?.failed ?? 0} en erreur, ${body?.skipped ?? 0} ignorée(s).`
        });
        setSelectedCount(0);
        router.refresh();
      } catch (error) {
        toast.error("Connexion interrompue", {
          description: error instanceof Error ? error.message : "Impossible de créer les issues sélectionnées."
        });
      }
    });
  }

  return (
    <form
      className="bulk-issue-form"
      onChange={(event) => updateSelectedCount(event.currentTarget)}
      onSubmit={(event) => {
        event.preventDefault();
        createSelectedIssues(new FormData(event.currentTarget));
      }}
    >
      <div className="bulk-issue-toolbar">
        <div>
          <strong>Création par lot</strong>
          <span>{selectedCount > 0 ? `${selectedCount} feedback${selectedCount > 1 ? "s" : ""} sélectionné${selectedCount > 1 ? "s" : ""}` : "Cochez les feedbacks à envoyer en issues."}</span>
        </div>
        <button className="button" disabled={isPending || selectedCount === 0} type="submit">
          <Send aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
          {isPending ? "Création..." : "Créer les issues sélectionnées"}
        </button>
      </div>
      {children}
    </form>
  );
}
