const languageStorageKey = "changethis:preferredLanguage";

type Locale = "fr" | "en";

export function inferEndpoint(documentRef: Document = document): string {
  const script = documentRef.currentScript as HTMLScriptElement | null;
  const endpoint = script?.dataset.endpoint;
  if (endpoint) return endpoint;

  if (script?.src) {
    return new URL("/api/public/feedback", script.src).toString();
  }

  return "/api/public/feedback";
}

export function inferLocale(
  documentRef: Document = document,
  storage: Pick<Storage, "getItem"> = window.localStorage
): Locale {
  const script = documentRef.currentScript as HTMLScriptElement | null;
  const scriptLocale = script?.dataset.locale;
  if (isLocale(scriptLocale)) {
    return scriptLocale;
  }

  const storedLocale = storage.getItem(languageStorageKey);
  if (isLocale(storedLocale)) {
    return storedLocale;
  }

  return documentRef.documentElement.lang.toLowerCase().startsWith("fr") ? "fr" : "en";
}

function isLocale(value: string | undefined | null): value is Locale {
  return value === "fr" || value === "en";
}
