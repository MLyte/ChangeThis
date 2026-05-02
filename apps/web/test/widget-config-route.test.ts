import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import test from "node:test";

type WidgetConfigRouteModule = typeof import("../app/api/widget/config/route.ts");

const routeModule = await import(pathToFileURL(`${process.cwd()}/app/api/widget/config/route.ts`).href) as WidgetConfigRouteModule;

test("/api/widget/config returns only widget-safe project fields", async () => {
  const response = await routeModule.GET(new Request("http://localhost:3000/api/widget/config?project=demo_project_key", {
    headers: {
      Origin: "http://localhost:3000"
    }
  }));

  assert.equal(response.status, 200);
  const body = await response.json() as Record<string, unknown>;

  assert.equal(body.projectKey, "demo_project_key");
  assert.equal(body.endpoint, "/api/public/feedback");
  assert.deepEqual(body.modes, ["comment", "pin", "screenshot"]);
  assert.deepEqual(Object.keys(body).sort(), [
    "buttonPosition",
    "buttonVariant",
    "endpoint",
    "locale",
    "modes",
    "name",
    "projectKey"
  ]);
});
