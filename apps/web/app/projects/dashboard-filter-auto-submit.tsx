"use client";

import { useEffect, useRef } from "react";

export function DashboardFilterAutoSubmit() {
  const markerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const form = markerRef.current?.closest("form") as HTMLFormElement | null;

    if (!form) {
      return;
    }

    let searchTimer: ReturnType<typeof window.setTimeout> | undefined;

    function submitFilters() {
      if (searchTimer) {
        window.clearTimeout(searchTimer);
      }

      if (typeof form.requestSubmit === "function") {
        form.requestSubmit();
        return;
      }

      form.submit();
    }

    function onChange(event: Event) {
      const target = event.target;

      if (!(target instanceof HTMLSelectElement)) {
        return;
      }

      submitFilters();
    }

    function onInput(event: Event) {
      const target = event.target;

      if (!(target instanceof HTMLInputElement) || target.name !== "q") {
        return;
      }

      if (searchTimer) {
        window.clearTimeout(searchTimer);
      }

      searchTimer = window.setTimeout(() => {
        submitFilters();
      }, 450);
    }

    form.addEventListener("change", onChange);
    form.addEventListener("input", onInput);

    return () => {
      if (searchTimer) {
        window.clearTimeout(searchTimer);
      }

      form.removeEventListener("change", onChange);
      form.removeEventListener("input", onInput);
    };
  }, []);

  return (
    <span className="filter-auto-submit-status" ref={markerRef}>
      Mise à jour auto
    </span>
  );
}
