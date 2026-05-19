"use client";

import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

type BulkIssueFormProps = {
  children: ReactNode;
  showTableHead?: boolean;
};

export function BulkIssueForm({ children, showTableHead = false }: BulkIssueFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedCount, setSelectedCount] = useState(0);
  const [selectableCount, setSelectableCount] = useState(0);
  const [isPending, startTransition] = useTransition();

  function updateSelectionState(form: HTMLFormElement) {
    const selectableInputs = form.querySelectorAll<HTMLInputElement>("input[name='feedbackId']:not(:disabled)");
    const checkedInputs = form.querySelectorAll<HTMLInputElement>("input[name='feedbackId']:checked:not(:disabled)");
    setSelectableCount(selectableInputs.length);
    setSelectedCount(checkedInputs.length);
  }

  function toggleAll(checked: boolean) {
    const form = formRef.current;

    if (!form) {
      return;
    }

    const selectableInputs = form.querySelectorAll<HTMLInputElement>("input[name='feedbackId']:not(:disabled)");
    selectableInputs.forEach((input) => {
      input.checked = checked;
    });
    updateSelectionState(form);
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

  useEffect(() => {
    if (!formRef.current) {
      return;
    }

    updateSelectionState(formRef.current);
  }, []);

  const allSelected = selectableCount > 0 && selectedCount === selectableCount;
  const someSelected = selectedCount > 0 && selectedCount < selectableCount;
  const selectAllLabel = selectableCount > 0
    ? allSelected || someSelected
      ? "Désélectionner tous les feedbacks affichés"
      : "Sélectionner tous les feedbacks affichés"
    : "Aucun feedback sélectionnable dans cette vue";

  return (
    <form
      className="bulk-issue-form"
      onChange={(event) => updateSelectionState(event.currentTarget)}
      onSubmit={(event) => {
        event.preventDefault();
        createSelectedIssues(new FormData(event.currentTarget));
      }}
      ref={formRef}
    >
      <div className="bulk-issue-toolbar">
        <div className="bulk-issue-toolbar-summary">
          <strong>Création par lot</strong>
          <span>
            {selectableCount > 0
              ? selectedCount > 0
                ? `${selectedCount} sélectionné${selectedCount > 1 ? "s" : ""} sur ${selectableCount} affiché${selectableCount > 1 ? "s" : ""}`
                : `Cochez parmi les ${selectableCount} feedback${selectableCount > 1 ? "s" : ""} affiché${selectableCount > 1 ? "s" : ""}.`
              : "Aucun feedback sélectionnable dans cette vue."}
          </span>
        </div>
        <div className="bulk-issue-toolbar-actions">
          <button
            className="button secondary-button"
            disabled={selectableCount === 0}
            onClick={() => toggleAll(!allSelected)}
            type="button"
          >
            {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
          </button>
          <button className="button" disabled={isPending || selectedCount === 0} type="submit">
            <Send aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
            {isPending ? "Création..." : "Créer les issues sélectionnées"}
          </button>
        </div>
      </div>
      {showTableHead ? (
        <div className="feedback-table-head">
          <label className="feedback-select feedback-select-all">
            <SelectAllCheckbox
              allSelected={allSelected}
              ariaLabel={selectAllLabel}
              disabled={selectableCount === 0}
              onChange={toggleAll}
              someSelected={someSelected}
            />
          </label>
          <span>Feedback</span>
          <span>Site / page</span>
          <span>Statut</span>
          <span>Capture</span>
          <span>Issue</span>
          <span>Reçu</span>
          <span>Actions</span>
        </div>
      ) : null}
      {children}
    </form>
  );
}

function SelectAllCheckbox({
  allSelected,
  ariaLabel,
  disabled,
  onChange,
  someSelected
}: {
  allSelected: boolean;
  ariaLabel: string;
  disabled: boolean;
  onChange: (checked: boolean) => void;
  someSelected: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!inputRef.current) {
      return;
    }

    inputRef.current.indeterminate = someSelected;
  }, [someSelected]);

  return (
    <input
      aria-label={ariaLabel}
      checked={allSelected}
      disabled={disabled}
      onChange={(event) => onChange(event.currentTarget.checked)}
      ref={inputRef}
      type="checkbox"
    />
  );
}
