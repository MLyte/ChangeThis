import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import test from "node:test";
import type { AuthSession } from "../lib/auth.ts";

type AuthModule = typeof import("../lib/auth.ts");

const originalEnv = {
  AUTH_MODE: process.env.AUTH_MODE,
  ENABLE_PUBLIC_SIGNUP: process.env.ENABLE_PUBLIC_SIGNUP,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NODE_ENV: process.env.NODE_ENV,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  VERCEL_ENV: process.env.VERCEL_ENV
};
const originalFetch = globalThis.fetch;
let importCounter = 0;

test.afterEach(() => {
  restoreEnv();
  globalThis.fetch = originalFetch;
});

test("local auth mode returns the local owner session outside production", async () => {
  process.env.AUTH_MODE = "local";
  Reflect.set(process.env, "NODE_ENV", "development");
  delete process.env.VERCEL_ENV;

  const auth = await importAuthModule();
  const session = await auth.getCurrentSession();

  assert.deepEqual(session, {
    user: {
      id: "local-dev-user",
      email: "local-dev@changethis.test"
    },
    workspace: {
      id: "workspace_changethis_local",
      name: "ChangeThis Local",
      role: "owner"
    }
  });
  assert.equal(auth.hasWorkspaceRole(session!, "admin"), true);
});

test("supabase auth without configuration behaves as an absent session", async () => {
  process.env.AUTH_MODE = "supabase";
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  const auth = await importAuthModule();

  assert.equal(await auth.getCurrentSession(), null);
  assert.deepEqual(await auth.requireWorkspaceSession(), {
    error: "Authentication required",
    status: 401
  });
});

test("supabase auth resolves bearer token user and active workspace", async () => {
  process.env.AUTH_MODE = "supabase";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.example.test";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-test-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test-key";

  const calls: string[] = [];
  globalThis.fetch = async (input, init) => {
    const url = new URL(input.toString());
    calls.push(`${url.pathname}?${url.searchParams.toString()}`);

    if (url.pathname === "/auth/v1/user") {
      assert.equal(new Headers(init?.headers).get("authorization"), "Bearer request-token");
      assert.equal(new Headers(init?.headers).get("apikey"), "anon-test-key");
      return jsonResponse({
        id: "user_123",
        email: "user@example.test"
      });
    }

    if (url.pathname === "/rest/v1/workspace_members") {
      assert.equal(url.searchParams.get("user_id"), "eq.user_123");
      assert.equal(url.searchParams.get("status"), "eq.active");
      return jsonResponse([{
        organization_id: "workspace_123",
        role: "admin"
      }]);
    }

    if (url.pathname === "/rest/v1/organizations") {
      assert.equal(url.searchParams.get("id"), "eq.workspace_123");
      return jsonResponse([{
        id: "workspace_123",
        name: "Workspace Test"
      }]);
    }

    throw new Error(`Unexpected Supabase request: ${url.toString()}`);
  };

  const auth = await importAuthModule();
  const session = await auth.getCurrentSession(new Request("https://app.example.test", {
    headers: {
      Authorization: "Bearer request-token"
    }
  }));

  assert.deepEqual(session, {
    user: {
      id: "user_123",
      email: "user@example.test"
    },
    workspace: {
      id: "workspace_123",
      name: "Workspace Test",
      role: "admin"
    }
  });
  assert.equal(auth.hasWorkspaceRole(session!, ["admin", "owner"]), true);
  assert.equal(calls.some((call) => call.startsWith("/rest/v1/workspace_members?")), true);
});

test("workspace role checks enforce the configured hierarchy", async () => {
  const auth = await importAuthModule();
  const viewerSession: AuthSession = {
    user: {
      id: "viewer",
      email: "viewer@example.test"
    },
    workspace: {
      id: "workspace",
      name: "Workspace",
      role: "viewer"
    }
  };
  const ownerSession: AuthSession = {
    ...viewerSession,
    workspace: {
      ...viewerSession.workspace!,
      role: "owner"
    }
  };

  assert.equal(auth.hasWorkspaceRole(viewerSession, "member"), false);
  assert.equal(auth.hasWorkspaceRole(ownerSession, ["admin", "owner"]), true);
  assert.deepEqual(auth.requireWorkspaceRole(viewerSession, "member"), {
    error: "Insufficient workspace role",
    status: 403
  });
  assert.equal(auth.requireWorkspaceRole(ownerSession, "admin"), ownerSession);
});

async function importAuthModule(): Promise<AuthModule> {
  importCounter += 1;
  return await import(`${pathToFileURL(`${process.cwd()}/lib/auth.ts`).href}?auth-test-${importCounter}`) as AuthModule;
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json"
    },
    status: 200
  });
}

function restoreEnv(): void {
  restoreEnvValue("AUTH_MODE", originalEnv.AUTH_MODE);
  restoreEnvValue("ENABLE_PUBLIC_SIGNUP", originalEnv.ENABLE_PUBLIC_SIGNUP);
  restoreEnvValue("NEXT_PUBLIC_SUPABASE_ANON_KEY", originalEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  restoreEnvValue("NEXT_PUBLIC_SUPABASE_URL", originalEnv.NEXT_PUBLIC_SUPABASE_URL);
  restoreEnvValue("NODE_ENV", originalEnv.NODE_ENV);
  restoreEnvValue("SUPABASE_SERVICE_ROLE_KEY", originalEnv.SUPABASE_SERVICE_ROLE_KEY);
  restoreEnvValue("VERCEL_ENV", originalEnv.VERCEL_ENV);
}

function restoreEnvValue(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}
