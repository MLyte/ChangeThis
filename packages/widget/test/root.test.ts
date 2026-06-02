import assert from "node:assert/strict";
import test from "node:test";

type FakeListener = (event?: unknown) => void;

class FakeElement {
  id = "";
  innerHTML = "";
  shadowRoot: FakeShadowRoot | null = null;
  style = {
    setProperty() {
      // Test double: style writes are not relevant to these assertions.
    }
  };
  dataset: Record<string, string> = {};
  private listeners = new Map<string, FakeListener>();

  addEventListener(type: string, listener: FakeListener) {
    this.listeners.set(type, listener);
  }

  attachShadow(): FakeShadowRoot {
    this.shadowRoot = new FakeShadowRoot();
    return this.shadowRoot;
  }

  click() {
    this.listeners.get("click")?.();
  }
}

class FakeShadowRoot {
  innerHTML = "";
  private elements = new Map<string, FakeElement>();

  querySelector(selector: string): FakeElement | null {
    if (selector === "[data-action='toggle']" || selector === "[data-action='open-help']") {
      return this.elementFor(selector);
    }

    return null;
  }

  querySelectorAll(): FakeElement[] {
    return [];
  }

  private elementFor(selector: string): FakeElement {
    const existing = this.elements.get(selector);
    if (existing) {
      return existing;
    }

    const element = new FakeElement();
    this.elements.set(selector, element);
    return element;
  }
}


test("initChangeThis does not create another root when one already exists", async () => {
  let createElementCalls = 0;
  const existingRoot = { id: "changethis-widget-root" };
  const documentRef = {
    currentScript: null,
    documentElement: {
      appendChild() {
        assert.fail("initChangeThis should not append a second root");
      },
      lang: "en"
    },
    getElementById(id: string) {
      return id === "changethis-widget-root" ? existingRoot : null;
    },
    createElement() {
      createElementCalls += 1;
      assert.fail("initChangeThis should not create a second root");
    }
  };

  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: documentRef
  });

  const { initChangeThis } = await import("../src/index.ts");

  initChangeThis({ projectKey: "pk_test" });

  assert.equal(createElementCalls, 0);
});

test("initChangeThis escapes configured button labels in the shadow DOM", async () => {
  let appendedRoot: FakeElement | undefined;
  const documentRef = {
    currentScript: null,
    documentElement: {
      appendChild(element: FakeElement) {
        appendedRoot = element;
      },
      lang: "en"
    },
    getElementById() {
      return null;
    },
    createElement() {
      return new FakeElement();
    },
    addEventListener() {},
    querySelectorAll() {
      return [];
    }
  };

  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: documentRef
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      addEventListener() {},
      history: {
        pushState() {},
        replaceState() {}
      },
      innerHeight: 768,
      localStorage: {
        getItem() {
          return null;
        },
        setItem() {}
      },
      location: {
        hash: "",
        href: "https://client.example.test/page",
        origin: "https://client.example.test",
        pathname: "/page",
        search: ""
      },
      queueMicrotask(callback: () => void) {
        callback();
      },
      scrollX: 0,
      scrollY: 0
    }
  });

  const { initChangeThis } = await import("../src/index.ts");

  initChangeThis({
    projectKey: "pk_escape",
    buttonLabel: "<img src=x onerror=alert(1)> Feedback & \"QA\"",
    buttonStateLabel: "<strong>beta</strong> & \"dev\""
  });

  const html = appendedRoot?.shadowRoot?.innerHTML ?? "";

  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt; Feedback &amp; &quot;QA&quot;/);
  assert.match(html, /<svg class="brand-logo-icon" aria-hidden="true" viewBox="14 1 17 23" role="img">/);
  assert.doesNotMatch(html, /src="data:image\/png;base64,/);
  assert.match(html, /&lt;strong&gt;beta&lt;\/strong&gt; &amp; &quot;dev&quot;/);
  assert.doesNotMatch(html, /<img src=x onerror=alert\(1\)>/);
  assert.doesNotMatch(html, /<strong>beta<\/strong>/);
});

test("initChangeThis defaults the French button label to Commenter", async () => {
  let appendedRoot: FakeElement | undefined;
  const documentRef = {
    currentScript: null,
    documentElement: {
      appendChild(element: FakeElement) {
        appendedRoot = element;
      },
      lang: "fr"
    },
    getElementById() {
      return null;
    },
    createElement() {
      return new FakeElement();
    },
    addEventListener() {},
    querySelectorAll() {
      return [];
    }
  };

  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: documentRef
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      addEventListener() {},
      history: {
        pushState() {},
        replaceState() {}
      },
      innerHeight: 768,
      localStorage: {
        getItem() {
          return null;
        },
        setItem() {}
      },
      location: {
        hash: "",
        href: "https://client.example.test/page",
        origin: "https://client.example.test",
        pathname: "/page",
        search: ""
      },
      queueMicrotask(callback: () => void) {
        callback();
      },
      scrollX: 0,
      scrollY: 0
    }
  });

  const { initChangeThis } = await import("../src/index.ts");

  initChangeThis({ projectKey: "pk_commenter", locale: "fr" });

  const html = appendedRoot?.shadowRoot?.innerHTML ?? "";
  const buttonHtml = html.match(/<button class="button"[\s\S]*?<\/button>/)?.[0] ?? "";

  assert.match(buttonHtml, /aria-label="Commenter"/);
  assert.match(buttonHtml, /<svg class="brand-logo-icon" aria-hidden="true" viewBox="14 1 17 23" role="img">/);
  assert.doesNotMatch(buttonHtml, /src="data:image\/png;base64,/);
  assert.match(buttonHtml, /<span>Commenter<\/span>/);
});

test("initChangeThis renders subtle button as the brand hand logo without visible text", async () => {
  let appendedRoot: FakeElement | undefined;
  const documentRef = {
    currentScript: null,
    documentElement: {
      appendChild(element: FakeElement) {
        appendedRoot = element;
      },
      lang: "en"
    },
    getElementById() {
      return null;
    },
    createElement() {
      return new FakeElement();
    },
    addEventListener() {},
    querySelectorAll() {
      return [];
    }
  };

  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: documentRef
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      addEventListener() {},
      history: {
        pushState() {},
        replaceState() {}
      },
      innerHeight: 768,
      localStorage: {
        getItem() {
          return null;
        },
        setItem() {}
      },
      location: {
        hash: "",
        href: "https://client.example.test/page",
        origin: "https://client.example.test",
        pathname: "/page",
        search: ""
      },
      queueMicrotask(callback: () => void) {
        callback();
      },
      scrollX: 0,
      scrollY: 0
    }
  });

  const { initChangeThis } = await import("../src/index.ts");

  initChangeThis({
    projectKey: "pk_subtle",
    buttonLabel: "Feedback",
    buttonStateLabel: "beta",
    buttonVariant: "subtle"
  });

  const html = appendedRoot?.shadowRoot?.innerHTML ?? "";
  const buttonHtml = html.match(/<button class="button"[\s\S]*?<\/button>/)?.[0] ?? "";

  assert.match(html, /data-variant="subtle"/);
  assert.match(buttonHtml, /aria-label="Feedback"/);
  assert.match(buttonHtml, /<svg class="brand-logo-icon" aria-hidden="true" viewBox="14 1 17 23" role="img">/);
  assert.doesNotMatch(buttonHtml, /src="data:image\/png;base64,/);
  assert.match(buttonHtml, /aria-hidden="true"/);
  assert.doesNotMatch(buttonHtml, /<svg class="lucide-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="m8 2 1\.88 1\.88"/);
  assert.doesNotMatch(buttonHtml, /<span>Feedback<\/span>/);
  assert.doesNotMatch(buttonHtml, /button-state/);
});

test("initChangeThis renders configured title and enabled modes", async () => {
  let appendedRoot: FakeElement | undefined;
  const documentRef = {
    currentScript: null,
    documentElement: {
      appendChild(element: FakeElement) {
        appendedRoot = element;
      },
      lang: "fr"
    },
    getElementById() {
      return null;
    },
    createElement() {
      return new FakeElement();
    },
    addEventListener() {},
    querySelectorAll() {
      return [];
    }
  };

  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: documentRef
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      addEventListener() {},
      history: {
        pushState() {},
        replaceState() {}
      },
      innerHeight: 768,
      localStorage: {
        getItem() {
          return null;
        },
        setItem() {}
      },
      location: {
        hash: "",
        href: "https://client.example.test/page",
        origin: "https://client.example.test",
        pathname: "/page",
        search: ""
      },
      queueMicrotask(callback: () => void) {
        callback();
      },
      scrollX: 0,
      scrollY: 0
    }
  });

  const { initChangeThis } = await import("../src/index.ts");

  initChangeThis({
    projectKey: "pk_modes",
    title: "**Retour UX prioritaire**\n- Décris le problème\n- Ajoute le contexte utile",
    modes: ["comment"]
  });
  appendedRoot?.shadowRoot?.querySelector("[data-action='toggle']")?.click();
  appendedRoot?.shadowRoot?.querySelector("[data-action='open-help']")?.click();

  const html = appendedRoot?.shadowRoot?.innerHTML ?? "";

  assert.match(html, /<button class="help-trigger" data-action="open-help"/);
  assert.doesNotMatch(html, /app\.changethis\.dev/);
  assert.match(html, /role="dialog" aria-modal="true"/);
  assert.match(html, /Comment utiliser ce widget/);
  assert.match(html, /<strong>Retour UX prioritaire<\/strong>/);
  assert.match(html, /<li>Décris le problème<\/li>/);
  assert.match(html, /href="https:\/\/mathieuluyten\.be"/);
  assert.match(html, /data-mode="comment"/);
  assert.doesNotMatch(html, /data-mode="pin"/);
  assert.doesNotMatch(html, /data-mode="screenshot"/);
});

test("initChangeThis hides pin and capture modes on touch viewports", async () => {
  let appendedRoot: FakeElement | undefined;
  const documentRef = {
    currentScript: null,
    documentElement: {
      appendChild(element: FakeElement) {
        appendedRoot = element;
      },
      lang: "en"
    },
    getElementById() {
      return null;
    },
    createElement() {
      return new FakeElement();
    },
    addEventListener() {},
    querySelectorAll() {
      return [];
    }
  };

  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: documentRef
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      addEventListener() {},
      history: {
        pushState() {},
        replaceState() {}
      },
      innerHeight: 720,
      innerWidth: 390,
      localStorage: {
        getItem() {
          return null;
        },
        setItem() {}
      },
      location: {
        hash: "",
        href: "https://client.example.test/page",
        origin: "https://client.example.test",
        pathname: "/page",
        search: ""
      },
      matchMedia(query: string) {
        return { matches: query.includes("pointer: coarse") || query.includes("max-width") };
      },
      queueMicrotask(callback: () => void) {
        callback();
      },
      scrollX: 0,
      scrollY: 0
    }
  });

  const { initChangeThis } = await import("../src/index.ts");

  initChangeThis({ projectKey: "pk_touch" });
  appendedRoot?.shadowRoot?.querySelector("[data-action='toggle']")?.click();

  const html = appendedRoot?.shadowRoot?.innerHTML ?? "";

  assert.match(html, /data-advanced="false"/);
  assert.match(html, /data-mode="comment"/);
  assert.doesNotMatch(html, /data-mode="pin"/);
  assert.doesNotMatch(html, /data-mode="screenshot"/);
});
