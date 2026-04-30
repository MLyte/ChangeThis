"use client";

import { DatabaseZap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

export function DemoSeedButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function seedDemoData() {
    startTransition(async () => {
      try {
        const response = await fetch("/api/projects/demo-seed", {
          method: "POST"
        });
        const body = await response.json().catch(() => undefined) as { createdFeedbacks?: number; createdSites?: number; skipped?: boolean; error?: string } | undefined;

        if (!response.ok) {
          toast.error("Seed impossible", {
            description: body?.error ?? "Le jeu de données réaliste n'a pas pu être créé."
          });
          return;
        }

        toast.success(body?.skipped ? "Jeu de données déjà présent" : "Jeu de données créé", {
          description: body?.skipped
            ? "Les feedbacks de simulation existent déjà dans ce workspace."
            : `${body?.createdSites ?? 0} sites et ${body?.createdFeedbacks ?? 0} feedbacks ajoutés.`
        });
        router.refresh();
      } catch (error) {
        toast.error("Connexion interrompue", {
          description: error instanceof Error ? error.message : "Impossible de créer le jeu de données."
        });
      }
    });
  }

  return (
    <button className="button secondary-button" disabled={isPending} onClick={seedDemoData} type="button">
      <DatabaseZap aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
      {isPending ? "Création..." : "Créer une simulation réaliste"}
    </button>
  );
}
