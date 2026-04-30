"use client";

import { DatabaseZap, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

type DemoSeedButtonProps = {
  hasLiveDemo: boolean;
};

export function DemoSeedButton({ hasLiveDemo }: DemoSeedButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function seedDemoData() {
    startTransition(async () => {
      try {
        const response = await fetch("/api/projects/demo-seed", {
          method: "POST"
        });
        const body = await response.json().catch(() => undefined) as { createdConnections?: number; createdFeedbacks?: number; createdSites?: number; skipped?: boolean; error?: string } | undefined;

        if (!response.ok) {
          toast.error("Seed impossible", {
            description: body?.error ?? "Le jeu de données réaliste n'a pas pu être créé."
          });
          return;
        }

        toast.success(body?.skipped ? "Jeu de données déjà présent" : "Jeu de données créé", {
          description: body?.skipped
            ? "Les feedbacks de simulation existent déjà dans ce workspace."
            : `${body?.createdSites ?? 0} sites, ${body?.createdFeedbacks ?? 0} feedbacks et ${body?.createdConnections ?? 0} comptes Git ajoutés.`
        });
        router.refresh();
      } catch (error) {
        toast.error("Connexion interrompue", {
          description: error instanceof Error ? error.message : "Impossible de créer le jeu de données."
        });
      }
    });
  }

  function resetDemoData() {
    const confirmed = window.confirm("Vider les feedbacks et sites connectés de ce workspace local ? Cette action remet la démo à zéro.");

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/projects/demo-reset", {
          method: "POST"
        });
        const body = await response.json().catch(() => undefined) as { deletedConnections?: number; deletedFeedbacks?: number; deletedSites?: number; error?: string } | undefined;

        if (!response.ok) {
          toast.error("Reset impossible", {
            description: body?.error ?? "La démo n'a pas pu être vidée."
          });
          return;
        }

        toast.success("Démo remise à zéro", {
          description: `${body?.deletedFeedbacks ?? 0} feedbacks, ${body?.deletedSites ?? 0} sites et ${body?.deletedConnections ?? 0} comptes Git supprimés.`
        });
        router.refresh();
      } catch (error) {
        toast.error("Connexion interrompue", {
          description: error instanceof Error ? error.message : "Impossible de vider la démo."
        });
      }
    });
  }

  return (
    <>
      {hasLiveDemo ? (
        <button className="button danger-button" disabled={isPending} onClick={resetDemoData} type="button">
          <Trash2 aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
          {isPending ? "Reset..." : "Vider la démo"}
        </button>
      ) : (
        <button className="button secondary-button" disabled={isPending} onClick={seedDemoData} type="button">
          <DatabaseZap aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
          {isPending ? "Création..." : "Créer une simulation réaliste"}
        </button>
      )}
    </>
  );
}
