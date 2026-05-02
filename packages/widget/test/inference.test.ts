import assert from "node:assert/strict";
import test from "node:test";
import { inferEndpoint, inferLocale } from "../src/inference.ts";

function documentWithScript(params: {
  endpoint?: string;
  locale?: string;
  src?: string;
  lang?: string;
} = {}): Document {
  return {
    currentScript: {
      dataset: {
        endpoint: params.endpoint,
        locale: params.locale
      },
      src: params.src
    },
    documentElement: {
      lang: params.lang ?? "en"
    }
  } as unknown as Document;
}

function storageWithLocale(locale: string | null): Pick<Storage, "getItem"> {
  return {
    getItem() {
      return locale;
    }
  };
}

test("inferEndpoint returns data-endpoint first", () => {
  assert.equal(
    inferEndpoint(documentWithScript({
      endpoint: "https://api.example.test/custom-feedback",
      src: "https://cdn.example.test/widget.global.js"
    })),
    "https://api.example.test/custom-feedback"
  );
});

test("inferEndpoint derives the public feedback endpoint from script src", () => {
  assert.equal(
    inferEndpoint(documentWithScript({
      src: "https://app.example.test/assets/widget.global.js"
    })),
    "https://app.example.test/api/public/feedback"
  );
});

test("inferEndpoint falls back to the relative public feedback endpoint", () => {
  assert.equal(inferEndpoint(documentWithScript()), "/api/public/feedback");
});

test("inferLocale returns data-locale before stored or document language", () => {
  assert.equal(
    inferLocale(
      documentWithScript({ locale: "fr", lang: "en-US" }),
      storageWithLocale("en")
    ),
    "fr"
  );
});

test("inferLocale returns the stored locale when script locale is unsupported", () => {
  assert.equal(
    inferLocale(
      documentWithScript({ locale: "de", lang: "fr-BE" }),
      storageWithLocale("en")
    ),
    "en"
  );
});

test("inferLocale falls back to document language", () => {
  assert.equal(inferLocale(documentWithScript({ lang: "fr-BE" }), storageWithLocale(null)), "fr");
  assert.equal(inferLocale(documentWithScript({ lang: "nl-BE" }), storageWithLocale(null)), "en");
});
