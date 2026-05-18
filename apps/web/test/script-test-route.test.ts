import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import test from "node:test";

type ScriptTestRouteModule = typeof import("../app/api/projects/sites/[projectKey]/script-test/route.ts");

const routeModule = await import(pathToFileURL(`${process.cwd()}/app/api/projects/sites/[projectKey]/script-test/route.ts`).href) as ScriptTestRouteModule;

test("detectWidgetCsp reports host CSP directives that block the widget", () => {
  const result = routeModule.detectWidgetCsp(
    "default-src 'self'; script-src 'self' https://unpkg.com; style-src 'self' 'unsafe-inline'; connect-src 'self'",
    "https://app.changethis.dev"
  );

  assert.equal(result.ok, false);

  if (!result.ok) {
    assert.equal(result.status, "csp_blocks_widget");
    assert.deepEqual(result.directives, [
      "script-src https://app.changethis.dev",
      "connect-src https://app.changethis.dev"
    ]);
  }
});

test("detectWidgetCsp accepts a CSP that allows the widget script, API calls and inline widget styles", () => {
  const result = routeModule.detectWidgetCsp(
    "default-src 'self'; script-src 'self' https://app.changethis.dev; style-src 'self' 'unsafe-inline'; connect-src 'self' https://app.changethis.dev",
    "https://app.changethis.dev"
  );

  assert.equal(result.ok, true);
});

test("detectWidgetScript rejects matching widget script with the wrong public key", () => {
  const result = routeModule.detectWidgetScript(
    '<script src="https://app.changethis.dev/widget.js" data-project="ct_other"></script>',
    "ct_expected"
  );

  assert.equal(result.ok, false);
  assert.equal(result.status, "project_key_mismatch");
});
