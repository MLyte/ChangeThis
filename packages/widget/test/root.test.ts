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
    if (selector === "[data-action='toggle']") {
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
  assert.match(html, /&lt;strong&gt;beta&lt;\/strong&gt; &amp; &quot;dev&quot;/);
  assert.doesNotMatch(html, /<img src=x onerror=alert\(1\)>/);
  assert.doesNotMatch(html, /<strong>beta<\/strong>/);
});
