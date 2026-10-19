import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { NextRequest } from "next/server";
import test from "node:test";

type ProxyModule = typeof import("../proxy.ts");

const proxyModule = await import(pathToFileURL(`${process.cwd()}/proxy.ts`).href) as ProxyModule;
const originalEnv = {
  AUTH_MODE: process.env.AUTH_MODE,
  NODE_ENV: process.env.NODE_ENV,
  VERCEL_ENV: process.env.VERCEL_ENV
};

test.afterEach(() => {
  restoreEnvValue("AUTH_MODE", originalEnv.AUTH_MODE);
  restoreEnvValue("NODE_ENV", originalEnv.NODE_ENV);
  restoreEnvValue("VERCEL_ENV", originalEnv.VERCEL_ENV);
});

test("proxy lets protected routes pass with an internal session cookie", () => {
  process.env.AUTH_MODE = "internal";
  Reflect.set(process.env, "NODE_ENV", "production");

  const response = proxyModule.proxy(new NextRequest("https://app.changethis.dev/projects", {
    headers: {
      Cookie: "changethis_internal_session=session-token"
    }
  }));

  assert.equal(response.headers.get("location"), null);
});

test("proxy redirects protected routes without a session cookie", () => {
  process.env.AUTH_MODE = "internal";
  Reflect.set(process.env, "NODE_ENV", "production");

  const response = proxyModule.proxy(new NextRequest("https://app.changethis.dev/projects?status=open"));

  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "https://app.changethis.dev/login?next=%2Fprojects%3Fstatus%3Dopen");
});

function restoreEnvValue(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}
