"use client";

import { useEffect, useRef } from "react";

export function DashboardFilterAutoSubmit() {
  const markerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const form = markerRef.current?.closest("form") as HTMLFormElement | null;

    if (!form) {
      return;
    }

    const formElement = form;

    let searchTimer: ReturnType<typeof window.setTimeout> | undefined;

    function submitFilters() {
      if (searchTimer) {
        window.clearTimeout(searchTimer);
      }

      if (typeof formElement.requestSubmit === "function") {
        formElement.requestSubmit();
        return;
      }

      formElement.submit();
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

    formElement.addEventListener("change", onChange);
    formElement.addEventListener("input", onInput);

    return () => {
      if (searchTimer) {
        window.clearTimeout(searchTimer);
      }

      formElement.removeEventListener("change", onChange);
      formElement.removeEventListener("input", onInput);
    };
  }, []);

  return (
    <span className="filter-auto-submit-status" ref={markerRef}>
      Mise à jour auto
    </span>
  );
}
