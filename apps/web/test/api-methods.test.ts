import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import test from "node:test";

type FeedbackRouteModule = typeof import("../app/api/public/feedback/route.ts");
type FeedbackCancelRouteModule = typeof import("../app/api/public/feedback/[id]/cancel/route.ts");
type WidgetConfigRouteModule = typeof import("../app/api/widget/config/route.ts");

const feedbackRoute = await import(pathToFileURL(`${process.cwd()}/app/api/public/feedback/route.ts`).href) as FeedbackRouteModule;
const feedbackCancelRoute = await import(pathToFileURL(`${process.cwd()}/app/api/public/feedback/[id]/cancel/route.ts`).href) as FeedbackCancelRouteModule;
const widgetConfigRoute = await import(pathToFileURL(`${process.cwd()}/app/api/widget/config/route.ts`).href) as WidgetConfigRouteModule;

test("public feedback routes reject unsupported methods with Allow headers", async () => {
  await assertMethodNotAllowed(feedbackRoute.GET(new Request("http://localhost:3000/api/public/feedback")), "POST, OPTIONS");
  await assertMethodNotAllowed(feedbackRoute.DELETE(new Request("http://localhost:3000/api/public/feedback")), "POST, OPTIONS");

  await assertMethodNotAllowed(
    feedbackCancelRoute.GET(new Request("http://localhost:3000/api/public/feedback/feedback_1/cancel")),
    "POST, OPTIONS"
  );
  await assertMethodNotAllowed(
    feedbackCancelRoute.PATCH(new Request("http://localhost:3000/api/public/feedback/feedback_1/cancel")),
    "POST, OPTIONS"
  );
});

test("widget config route rejects unsupported methods with Allow header", async () => {
  await assertMethodNotAllowed(widgetConfigRoute.POST(new Request("http://localhost:3000/api/widget/config?project=demo_project_key")), "GET, HEAD");
  await assertMethodNotAllowed(widgetConfigRoute.DELETE(new Request("http://localhost:3000/api/widget/config?project=demo_project_key")), "GET, HEAD");
});

async function assertMethodNotAllowed(responsePromise: Response | Promise<Response>, allow: string): Promise<void> {
  const response = await responsePromise;

  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), allow);
  assert.deepEqual(await response.json(), { error: "Method not allowed" });
}
