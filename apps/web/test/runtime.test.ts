import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import test from "node:test";

type RuntimeModule = typeof import("../lib/runtime.ts");
type AuthModule = typeof import("../lib/auth.ts");
type PostgresModule = typeof import("../lib/postgres-server.ts");
type CrawAuthModule = typeof import("../lib/craw-auth.ts");
type FeedbackRepositoryModule = typeof import("../lib/feedback-repository.ts");
type ProjectRegistryModule = typeof import("../lib/project-registry.ts");
type CredentialStoreModule = typeof import("../lib/credential-store.ts");

const originalEnv = {
  AUTH_MODE: process.env.AUTH_MODE,
  CRAW_AUTH_SHARED_SECRET: process.env.CRAW_AUTH_SHARED_SECRET,
  DATABASE_URL: process.env.DATABASE_URL,
  DATA_STORE: process.env.DATA_STORE,
  NODE_ENV: process.env.NODE_ENV
};
let importCounter = 0;

test.afterEach(() => {
  restoreEnv();
});

test("runtime recognizes the CRAW postgres mode pair", async () => {
  process.env.AUTH_MODE = "craw";
  process.env.DATA_STORE = "postgres";
  process.env.CRAW_AUTH_SHARED_SECRET = "craw-auth-secret-with-at-least-32-chars";
  process.env.DATABASE_URL = "postgresql://changethis:secret@db.example.test:5432/changethis";

  const auth = await importAuthModule();
  const runtime = await importRuntimeModule();
  const crawAuth = await importCrawAuthModule();
  const postgres = await importPostgresModule();

  assert.equal(auth.getAuthMode(), "craw");
  assert.equal(runtime.getDataStoreMode(), "postgres");
  assert.equal(crawAuth.isCrawAuthConfigured(), true);
  assert.equal(postgres.isPostgresStoreConfigured(), true);
});

test("invalid postgres connection strings are not treated as configured", async () => {
  process.env.DATA_STORE = "postgres";
  process.env.DATABASE_URL = "https://db.example.test/changethis";

  const postgres = await importPostgresModule();

  assert.equal(postgres.isPostgresStoreConfigured(), false);
});

test("unknown runtime modes fall back to local development defaults", async () => {
  process.env.AUTH_MODE = "unknown";
  process.env.DATA_STORE = "unknown";
  Reflect.set(process.env, "NODE_ENV", "development");

  const auth = await importAuthModule();
  const runtime = await importRuntimeModule();

  assert.equal(auth.getAuthMode(), "local");
  assert.equal(runtime.getDataStoreMode(), "file");
});

test("postgres mode does not silently fall back to file stores", async () => {
  process.env.DATA_STORE = "postgres";

  const feedbackRepository = await importFeedbackRepositoryModule();
  const projectRegistry = await importProjectRegistryModule();
  const credentialStore = await importCredentialStoreModule();

  assert.throws(
    () => feedbackRepository.getFeedbackRepository(),
    /Feedback repository does not support DATA_STORE=postgres yet/
  );
  await assert.rejects(
    () => projectRegistry.listConfiguredProjects(),
    /Project registry does not support DATA_STORE=postgres yet/
  );
  assert.throws(
    () => credentialStore.getProviderCredentialSecret("github", "local-github", "access_token"),
    /Credential store does not support DATA_STORE=postgres yet/
  );
});

async function importRuntimeModule(): Promise<RuntimeModule> {
  importCounter += 1;
  return await import(`${pathToFileURL(`${process.cwd()}/lib/runtime.ts`).href}?runtime-test-${importCounter}`) as RuntimeModule;
}

async function importAuthModule(): Promise<AuthModule> {
  importCounter += 1;
  return await import(`${pathToFileURL(`${process.cwd()}/lib/auth.ts`).href}?auth-runtime-test-${importCounter}`) as AuthModule;
}

async function importPostgresModule(): Promise<PostgresModule> {
  importCounter += 1;
  return await import(`${pathToFileURL(`${process.cwd()}/lib/postgres-server.ts`).href}?postgres-runtime-test-${importCounter}`) as PostgresModule;
}

async function importCrawAuthModule(): Promise<CrawAuthModule> {
  importCounter += 1;
  return await import(`${pathToFileURL(`${process.cwd()}/lib/craw-auth.ts`).href}?craw-auth-runtime-test-${importCounter}`) as CrawAuthModule;
}

async function importFeedbackRepositoryModule(): Promise<FeedbackRepositoryModule> {
  importCounter += 1;
  return await import(`${pathToFileURL(`${process.cwd()}/lib/feedback-repository.ts`).href}?feedback-runtime-test-${importCounter}`) as FeedbackRepositoryModule;
}

async function importProjectRegistryModule(): Promise<ProjectRegistryModule> {
  importCounter += 1;
  return await import(`${pathToFileURL(`${process.cwd()}/lib/project-registry.ts`).href}?project-runtime-test-${importCounter}`) as ProjectRegistryModule;
}

async function importCredentialStoreModule(): Promise<CredentialStoreModule> {
  importCounter += 1;
  return await import(`${pathToFileURL(`${process.cwd()}/lib/credential-store.ts`).href}?credential-runtime-test-${importCounter}`) as CredentialStoreModule;
}

function restoreEnv(): void {
  restoreEnvValue("AUTH_MODE", originalEnv.AUTH_MODE);
  restoreEnvValue("CRAW_AUTH_SHARED_SECRET", originalEnv.CRAW_AUTH_SHARED_SECRET);
  restoreEnvValue("DATABASE_URL", originalEnv.DATABASE_URL);
  restoreEnvValue("DATA_STORE", originalEnv.DATA_STORE);
  restoreEnvValue("NODE_ENV", originalEnv.NODE_ENV);
}

function restoreEnvValue(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}
