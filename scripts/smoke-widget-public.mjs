#!/usr/bin/env node

const args = parseArgs(process.argv.slice(2));
const baseUrl = normalizeBaseUrl(args["base-url"] || process.env.CHANGETHIS_BASE_URL || "https://app.changethis.dev");
const projectKey = args["project-key"] || process.env.CHANGETHIS_SMOKE_PROJECT_KEY;
const origin = args.origin || process.env.CHANGETHIS_SMOKE_ORIGIN;
const shouldSendFeedback = Boolean(args.send || process.env.CHANGETHIS_SMOKE_SEND === "1");
const skipReady = Boolean(args["skip-ready"]);

if (args.help) {
  printUsage();
  process.exit(0);
}

const checks = [];

checks.push(await checkJson("health", "/api/health", 200));

if (!skipReady) {
  checks.push(await checkJson("ready", "/api/ready", 200));
}

checks.push(await checkBundle("/widget.js"));
checks.push(await checkBundle("/widget.global.js"));

if (projectKey && origin) {
  checks.push(await checkCorsPreflight(projectKey, origin));

  if (shouldSendFeedback) {
    checks.push(await sendFeedback(projectKey, origin));
  } else {
    checks.push(skip("feedback-post", "real feedback not sent; add --send to create one"));
  }
} else {
  checks.push(skip("feedback-cors", "set --project-key and --origin to test public feedback CORS"));
}

for (const check of checks) {
  const marker = check.ok ? "ok" : check.skipped ? "skip" : "fail";
  console.log(`[${marker}] ${check.name}: ${check.message}`);
}

const failed = checks.filter((check) => !check.ok && !check.skipped);
if (failed.length > 0) {
  process.exitCode = 1;
}

async function checkJson(name, path, expectedStatus) {
  const response = await request(path, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    return fail(name, response.message);
  }

  if (response.status !== expectedStatus) {
    return fail(name, `expected ${expectedStatus}, received ${response.status}`);
  }

  const text = await response.value.text();
  try {
    JSON.parse(text);
  } catch {
    return fail(name, "response is not valid JSON");
  }

  return ok(name, `${path} returned ${response.status}`);
}

async function checkBundle(path) {
  const response = await request(path, { headers: { Accept: "application/javascript,text/javascript,*/*" } });
  if (!response.ok) {
    return fail(path, response.message);
  }

  if (response.status !== 200) {
    return fail(path, `expected 200, received ${response.status}`);
  }

  const contentType = response.value.headers.get("content-type") || "";
  const text = await response.value.text();

  if (text.length < 1000) {
    return fail(path, `bundle is unexpectedly small (${text.length} bytes)`);
  }

  if (/^\s*<!doctype html/i.test(text) || /^\s*<html/i.test(text)) {
    return fail(path, "received HTML instead of JavaScript");
  }

  const contentTypeNote = contentType ? `, content-type ${contentType}` : "";
  return ok(path, `${text.length} bytes${contentTypeNote}`);
}

async function checkCorsPreflight(projectKey, origin) {
  const response = await request("/api/public/feedback", {
    method: "OPTIONS",
    headers: {
      Origin: origin,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "Content-Type"
    }
  });

  if (!response.ok) {
    return fail("feedback-cors", response.message);
  }

  if (response.status !== 204) {
    return fail("feedback-cors", `expected 204, received ${response.status}`);
  }

  const allowOrigin = response.value.headers.get("access-control-allow-origin");
  if (allowOrigin !== origin) {
    return fail("feedback-cors", `expected allow-origin ${origin}, received ${allowOrigin || "(missing)"}`);
  }

  return ok("feedback-cors", `origin ${origin} is accepted for project ${mask(projectKey)}`);
}

async function sendFeedback(projectKey, origin) {
  const now = new Date().toISOString();
  const payload = {
    projectKey,
    type: "comment",
    message: `Smoke beta widget externe ${now}`,
    metadata: {
      url: `${origin}/widget-external-smoke.html`,
      origin,
      path: "/widget-external-smoke.html",
      title: "ChangeThis external widget smoke",
      userAgent: "ChangeThis smoke-widget-public.mjs",
      viewport: {
        width: 1280,
        height: 720
      },
      devicePixelRatio: 1,
      language: "fr",
      timezone: "Europe/Brussels",
      online: true,
      createdAt: now,
      app: {
        environment: "beta-smoke",
        scenario: "script-public-feedback",
        testRunId: `script-smoke-${now}`
      }
    }
  };

  const response = await request("/api/public/feedback", {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    return fail("feedback-post", response.message);
  }

  const text = await response.value.text();
  if (response.status !== 200) {
    return fail("feedback-post", `expected 200, received ${response.status}: ${text.slice(0, 300)}`);
  }

  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return fail("feedback-post", "response is not valid JSON");
  }

  if (!body.id || body.status !== "received") {
    return fail("feedback-post", `unexpected response: ${text.slice(0, 300)}`);
  }

  return ok("feedback-post", `feedback ${body.id} received; verify it in /projects`);
}

async function request(path, init = {}) {
  const url = new URL(path, `${baseUrl}/`);
  try {
    const response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(15_000)
    });
    return { ok: true, status: response.status, value: response };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

function parseArgs(values) {
  const parsed = {};

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) {
      continue;
    }

    const key = value.slice(2);
    const next = values[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
      continue;
    }

    parsed[key] = next;
    index += 1;
  }

  return parsed;
}

function normalizeBaseUrl(value) {
  try {
    const url = new URL(value);
    return url.href.replace(/\/+$/, "");
  } catch {
    console.error(`[fail] config: invalid --base-url ${value}`);
    process.exit(1);
  }
}

function mask(value) {
  return value.length <= 8 ? "********" : `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function ok(name, message) {
  return { ok: true, name, message };
}

function fail(name, message) {
  return { ok: false, name, message };
}

function skip(name, message) {
  return { ok: false, skipped: true, name, message };
}

function printUsage() {
  console.log(`Usage:
  npm run smoke:widget -- --base-url https://app.changethis.dev
  npm run smoke:widget -- --base-url https://app.changethis.dev --project-key PROJECT_PUBLIC_KEY --origin https://smoke.example
  npm run smoke:widget -- --base-url https://app.changethis.dev --project-key PROJECT_PUBLIC_KEY --origin https://smoke.example --send

Options:
  --base-url      ChangeThis app URL. Defaults to CHANGETHIS_BASE_URL or https://app.changethis.dev.
  --project-key   Public project key used by the widget.
  --origin        Browser origin configured on the connected site.
  --send          Create a real feedback through /api/public/feedback.
  --skip-ready    Skip /api/ready when checking a local or intentionally partial environment.
`);
}
