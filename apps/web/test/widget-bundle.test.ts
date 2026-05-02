import assert from "node:assert/strict";
import test from "node:test";
import { missingWidgetBundleFallback, missingWidgetBundleResponse, widgetBundleResponse } from "../lib/widget-bundle.ts";
import { GET as getWidget } from "../app/widget.js/route.ts";
import { GET as getGlobalWidget } from "../app/widget.global.js/route.ts";

test("widgetBundleResponse serves JavaScript with content-versioned cache headers", () => {
  const response = widgetBundleResponse("console.log('ok');");

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "application/javascript; charset=utf-8");
  assert.equal(response.headers.get("Cache-Control"), "public, max-age=300, stale-while-revalidate=86400");
  assert.match(response.headers.get("ETag") ?? "", /^"changethis-widget-[a-f0-9]{16}"$/);
  assert.match(response.headers.get("X-ChangeThis-Widget-Version") ?? "", /^[a-f0-9]{16}$/);
  assert.equal(response.headers.get("X-ChangeThis-Widget-Fallback"), null);
});

test("public widget routes serve the built bundle as JavaScript when present", async () => {
  for (const getRoute of [getWidget, getGlobalWidget]) {
    const response = await getRoute();
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Content-Type"), "application/javascript; charset=utf-8");
    assert.equal(response.headers.get("Cache-Control"), "public, max-age=300, stale-while-revalidate=86400");
    assert.match(response.headers.get("ETag") ?? "", /^"changethis-widget-[a-f0-9]{16}"$/);
    assert.equal(response.headers.get("X-ChangeThis-Widget-Fallback"), null);
    assert.match(body, /^var ChangeThis=/);
    assert.doesNotThrow(() => new Function(body));
  }
});

test("missingWidgetBundleResponse serves executable fallback JavaScript", async () => {
  const response = missingWidgetBundleResponse();
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "application/javascript; charset=utf-8");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(response.headers.get("X-ChangeThis-Widget-Fallback"), "missing-bundle");
  assert.match(body, /missing-widget-bundle/);
  assert.match(body, /Feedback indisponible/);
  assert.doesNotThrow(() => new Function(body));
});

test("missingWidgetBundleFallback can be silenced by integrators", () => {
  assert.match(missingWidgetBundleFallback(), /dataset\?\.fallback === "silent"/);
});
