"use client";

import { X } from "lucide-react";
import { useState } from "react";

type DemoTestPanelProps = {
  publicKey: string;
};

const storageKey = "changethis-demo-test-panel-dismissed";

export function DemoTestPanel({ publicKey }: DemoTestPanelProps) {
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }

    try {
      return window.localStorage.getItem(storageKey) !== "true";
    } catch {
      return true;
    }
  });

  const dismissPanel = () => {
    try {
      window.localStorage.setItem(storageKey, "true");
    } catch {
      // The in-memory state still hides the helper when storage is unavailable.
    }

    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <aside className="demo-test-panel" aria-label="Aide test Feedback">
      <button
        aria-label="Masquer l'aide de test"
        className="demo-test-panel-dismiss"
        onClick={dismissPanel}
        type="button"
      >
        <X aria-hidden="true" size={14} strokeWidth={2.4} />
        <span>Masquer</span>
      </button>
      <strong>Testez ChangeThis ici</strong>
      <span>Le bouton Feedback est en bas à droite. Cliquez dessus pour signaler cette page.</span>
      <code>{publicKey}</code>
    </aside>
  );
}
