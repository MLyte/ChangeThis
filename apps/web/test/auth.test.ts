import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import test from "node:test";
import type { AuthSession } from "../lib/auth.ts";

type AuthModule = typeof import("../lib/auth.ts");

const originalEnv = {
  AUTH_MODE: process.env.AUTH_MODE,
  ENABLE_PUBLIC_SIGNUP: process.env.ENABLE_PUBLIC_SIGNUP,
  INTERNAL_API_URL: process.env.INTERNAL_API_URL,
  NODE_ENV: process.env.NODE_ENV,
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

test("internal auth resolves the session through the FastAPI backend", async () => {
  process.env.AUTH_MODE = "internal";
  process.env.INTERNAL_API_URL = "http://back.example.test:8000";

  globalThis.fetch = async (input, init) => {
    const url = new URL(input.toString());
    assert.equal(url.origin, "http://back.example.test:8000");
    assert.equal(url.pathname, "/auth/session");
    assert.equal(new Headers(init?.headers).get("cookie"), "changethis_internal_session=session-token");

    return jsonResponse({
      user: {
        id: "user_internal",
        email: "internal@example.test"
      },
      workspace: {
        id: "workspace_internal",
        name: "Internal Workspace",
        role: "owner"
      }
    });
  };

  const auth = await importAuthModule();
  const session = await auth.getCurrentSession(new Request("https://app.example.test", {
    headers: {
      Cookie: "changethis_internal_session=session-token"
    }
  }));

  assert.deepEqual(session, {
    user: {
      id: "user_internal",
      email: "internal@example.test"
    },
    workspace: {
      id: "workspace_internal",
      name: "Internal Workspace",
      role: "owner"
    }
  });
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

test("public signup is open by default and can be paused explicitly", async () => {
  delete process.env.ENABLE_PUBLIC_SIGNUP;

  let auth = await importAuthModule();
  assert.equal(auth.isPublicSignupEnabled(), true);

  process.env.ENABLE_PUBLIC_SIGNUP = "false";
  auth = await importAuthModule();
  assert.equal(auth.isPublicSignupEnabled(), false);

  process.env.ENABLE_PUBLIC_SIGNUP = "0";
  auth = await importAuthModule();
  assert.equal(auth.isPublicSignupEnabled(), false);

  process.env.ENABLE_PUBLIC_SIGNUP = "true";
  auth = await importAuthModule();
  assert.equal(auth.isPublicSignupEnabled(), true);
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
  restoreEnvValue("INTERNAL_API_URL", originalEnv.INTERNAL_API_URL);
  restoreEnvValue("NODE_ENV", originalEnv.NODE_ENV);
  restoreEnvValue("VERCEL_ENV", originalEnv.VERCEL_ENV);
}

function restoreEnvValue(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}
