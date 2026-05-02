import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import test from "node:test";

type FeedbackRouteModule = typeof import("../app/api/public/feedback/route.ts");
type FeedbackCancelRouteModule = typeof import("../app/api/public/feedback/[id]/cancel/route.ts");
type WidgetConfigRouteModule = typeof import("../app/api/widget/config/route.ts");
type FeedbackBulkIssueRouteModule = typeof import("../app/api/projects/feedbacks/bulk-issue/route.ts");
type FeedbackIssueRouteModule = typeof import("../app/api/projects/feedbacks/[id]/issue/route.ts");
type FeedbackIgnoreRouteModule = typeof import("../app/api/projects/feedbacks/[id]/ignore/route.ts");
type FeedbackKeepRouteModule = typeof import("../app/api/projects/feedbacks/[id]/keep/route.ts");
type FeedbackSyncRouteModule = typeof import("../app/api/projects/feedbacks/[id]/sync/route.ts");
type IssueTargetsRouteModule = typeof import("../app/api/projects/issue-targets/route.ts");
type RetriesRouteModule = typeof import("../app/api/projects/retries/route.ts");

const feedbackRoute = await import(pathToFileURL(`${process.cwd()}/app/api/public/feedback/route.ts`).href) as FeedbackRouteModule;
const feedbackCancelRoute = await import(pathToFileURL(`${process.cwd()}/app/api/public/feedback/[id]/cancel/route.ts`).href) as FeedbackCancelRouteModule;
const widgetConfigRoute = await import(pathToFileURL(`${process.cwd()}/app/api/widget/config/route.ts`).href) as WidgetConfigRouteModule;
const feedbackBulkIssueRoute = await import(pathToFileURL(`${process.cwd()}/app/api/projects/feedbacks/bulk-issue/route.ts`).href) as FeedbackBulkIssueRouteModule;
const feedbackIssueRoute = await import(pathToFileURL(`${process.cwd()}/app/api/projects/feedbacks/[id]/issue/route.ts`).href) as FeedbackIssueRouteModule;
const feedbackIgnoreRoute = await import(pathToFileURL(`${process.cwd()}/app/api/projects/feedbacks/[id]/ignore/route.ts`).href) as FeedbackIgnoreRouteModule;
const feedbackKeepRoute = await import(pathToFileURL(`${process.cwd()}/app/api/projects/feedbacks/[id]/keep/route.ts`).href) as FeedbackKeepRouteModule;
const feedbackSyncRoute = await import(pathToFileURL(`${process.cwd()}/app/api/projects/feedbacks/[id]/sync/route.ts`).href) as FeedbackSyncRouteModule;
const issueTargetsRoute = await import(pathToFileURL(`${process.cwd()}/app/api/projects/issue-targets/route.ts`).href) as IssueTargetsRouteModule;
const retriesRoute = await import(pathToFileURL(`${process.cwd()}/app/api/projects/retries/route.ts`).href) as RetriesRouteModule;

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

test("private feedback action routes reject unsupported methods with Allow headers", async () => {
  await assertMethodNotAllowed(feedbackBulkIssueRoute.GET(new Request("http://localhost:3000/api/projects/feedbacks/bulk-issue")), "POST");
  await assertMethodNotAllowed(feedbackIssueRoute.GET(new Request("http://localhost:3000/api/projects/feedbacks/feedback_1/issue")), "POST");
  await assertMethodNotAllowed(feedbackIgnoreRoute.PATCH(new Request("http://localhost:3000/api/projects/feedbacks/feedback_1/ignore")), "POST");
  await assertMethodNotAllowed(feedbackKeepRoute.DELETE(new Request("http://localhost:3000/api/projects/feedbacks/feedback_1/keep")), "POST");
  await assertMethodNotAllowed(feedbackSyncRoute.PUT(new Request("http://localhost:3000/api/projects/feedbacks/feedback_1/sync")), "POST");
  await assertMethodNotAllowed(feedbackSyncRoute.OPTIONS(new Request("http://localhost:3000/api/projects/feedbacks/feedback_1/sync")), "POST");
});

test("private issue target and retry routes reject unsupported methods with Allow headers", async () => {
  await assertMethodNotAllowed(issueTargetsRoute.PATCH(new Request("http://localhost:3000/api/projects/issue-targets")), "GET, HEAD, POST");
  await assertMethodNotAllowed(issueTargetsRoute.OPTIONS(new Request("http://localhost:3000/api/projects/issue-targets")), "GET, HEAD, POST");
  await assertMethodNotAllowed(issueTargetsRoute.DELETE(new Request("http://localhost:3000/api/projects/issue-targets")), "GET, HEAD, POST");
  await assertMethodNotAllowed(retriesRoute.GET(new Request("http://localhost:3000/api/projects/retries")), "POST");
  await assertMethodNotAllowed(retriesRoute.DELETE(new Request("http://localhost:3000/api/projects/retries")), "POST");
});

async function assertMethodNotAllowed(responsePromise: Response | Promise<Response>, allow: string): Promise<void> {
  const response = await responsePromise;

  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), allow);
  assert.deepEqual(await response.json(), { error: "Method not allowed" });
}
