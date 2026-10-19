import assert from "node:assert/strict";
import test from "node:test";
import { missingWidgetBundleFallback, missingWidgetBundleResponse, widgetBundleResponse, widgetBundleVersion } from "../lib/widget-bundle.ts";
import { widgetLoaderResponse, widgetLoaderScript } from "../lib/widget-loader.ts";
import { GET as getWidgetLoader } from "../app/widget-loader.js/route.ts";
import { GET as getWidget } from "../app/widget.js/route.ts";
import { GET as getGlobalWidget } from "../app/widget.global.js/route.ts";

test("widgetBundleResponse serves JavaScript with content-versioned cache headers", () => {
  const widget = "console.log('ok');";
  const response = widgetBundleResponse(widget);
  const version = widgetBundleVersion(widget);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "application/javascript; charset=utf-8");
  assert.equal(response.headers.get("Cache-Control"), "public, max-age=300, stale-while-revalidate=86400");
  assert.match(response.headers.get("ETag") ?? "", /^"changethis-widget-[a-f0-9]{16}"$/);
  assert.equal(response.headers.get("X-ChangeThis-Widget-Version"), version);
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

test("widget loader serves JavaScript that preserves script data attributes with a content-versioned widget URL", async () => {
  for (const response of [await widgetLoaderResponse(), await getWidgetLoader()]) {
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Content-Type"), "application/javascript; charset=utf-8");
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.match(body, /widget\.js/);
    assert.match(body, /searchParams\.set\("v", "[a-f0-9]{16}"\)/);
    assert.doesNotMatch(body, /Date\.now/);
    assert.match(body, /Object\.entries\(currentScript\.dataset\)/);
    assert.doesNotThrow(() => new Function(body));
  }

  assert.match(widgetLoaderScript("1234567890abcdef"), /searchParams\.set\("v", "1234567890abcdef"\)/);
});
