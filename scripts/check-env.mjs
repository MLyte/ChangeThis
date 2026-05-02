#!/usr/bin/env node

const requiredBase = ["AUTH_MODE", "DATA_STORE", "NEXT_PUBLIC_APP_URL"];
const requiredForSupabase = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];
const fallbackProjectKeys = [
  "NEXT_PUBLIC_DEMO_PROJECT_KEY",
  "NEXT_PUBLIC_CHANGETHIS_PROJECT_KEY",
  "NEXT_PUBLIC_ANDENNE_BEARS_PROJECT_KEY",
  "NEXT_PUBLIC_OPTIMASTER_PROJECT_KEY",
  "NEXT_PUBLIC_YODA_CARROSSERIE_PROJECT_KEY",
];
const projectKeyFallbackValues = new Set([
  "demo_project_key",
  "changethis_project_key",
  "andenne_bears_project_key",
  "optimaster_project_key",
  "yoda_carrosserie_project_key",
]);
const placeholderValues = new Set([
  "change-me",
  "changeme",
  "example",
  "secret",
  "test",
  "todo",
]);

const raw = process.env;
const missing = [];
const blockers = [];
const isProduction =
  raw.NODE_ENV === "production"
  || raw.VERCEL_ENV === "production"
  || raw.RAILWAY_ENVIRONMENT === "production";

for (const key of requiredBase) {
  if (!raw[key]) {
    missing.push(key);
  }
}

if (isProduction && raw.AUTH_MODE === "local") {
  blockers.push("AUTH_MODE is not allowed to be local in production");
}
if (isProduction && raw.AUTH_MODE !== "supabase") {
  blockers.push("AUTH_MODE must be supabase for the current production beta path");
}
if (isProduction && raw.DATA_STORE === "file") {
  blockers.push("DATA_STORE is not allowed to be file in production");
}
if (isProduction && raw.DATA_STORE !== "supabase") {
  blockers.push("DATA_STORE must be supabase for the current production beta path");
}
if (isProduction) {
  if (raw.NEXT_PUBLIC_APP_URL && !raw.NEXT_PUBLIC_APP_URL.startsWith("https://")) {
    blockers.push("NEXT_PUBLIC_APP_URL must use https:// in production");
  }
  if (raw.NEXT_PUBLIC_APP_URL?.includes("example.com") || raw.NEXT_PUBLIC_APP_URL?.includes("localhost")) {
    blockers.push("NEXT_PUBLIC_APP_URL still points to an example or local host");
  }
  if (raw.CHANGETHIS_DATA_DIR) {
    blockers.push("CHANGETHIS_DATA_DIR should be unset in production unless a non-container fallback is explicitly approved");
  }
  for (const key of fallbackProjectKeys) {
    if (raw[key] && projectKeyFallbackValues.has(raw[key])) {
      blockers.push(`${key} uses a local fallback value in production (${raw[key]})`);
    }
  }
}

if (raw.AUTH_MODE === "supabase" || raw.DATA_STORE === "supabase") {
  for (const key of requiredForSupabase) {
    if (!raw[key]) {
      missing.push(key);
    }
  }
}

if (isProduction && !raw.CHANGETHIS_SECRET_KEY) {
  missing.push("CHANGETHIS_SECRET_KEY");
}
if (isProduction && raw.CHANGETHIS_SECRET_KEY) {
  if (raw.CHANGETHIS_SECRET_KEY.length < 32) {
    blockers.push("CHANGETHIS_SECRET_KEY must be at least 32 characters in production");
  }

  if (placeholderValues.has(raw.CHANGETHIS_SECRET_KEY.toLowerCase())) {
    blockers.push("CHANGETHIS_SECRET_KEY uses a placeholder value");
  }
}

if (raw.NEXT_PUBLIC_APP_URL && !/^https?:\/\//.test(raw.NEXT_PUBLIC_APP_URL)) {
  blockers.push("NEXT_PUBLIC_APP_URL must start with http:// or https://");
}
if (raw.NEXT_PUBLIC_SUPABASE_URL && !/^https:\/\/.+\.supabase\.co$/.test(raw.NEXT_PUBLIC_SUPABASE_URL)) {
  blockers.push("NEXT_PUBLIC_SUPABASE_URL should look like https://<project-ref>.supabase.co");
}

if (raw.GITHUB_PROVIDER_INTEGRATION_ID && !raw.GITHUB_WEBHOOK_SECRET) {
  missing.push("GITHUB_WEBHOOK_SECRET");
}
if (raw.GITHUB_APP_ID && !raw.GITHUB_APP_PRIVATE_KEY) {
  missing.push("GITHUB_APP_PRIVATE_KEY");
}

if (raw.GITLAB_PROVIDER_INTEGRATION_ID && !raw.GITLAB_WEBHOOK_SECRET) {
  missing.push("GITLAB_WEBHOOK_SECRET");
}

if (raw.GITLAB_OAUTH_APP_ID && !raw.GITLAB_OAUTH_APP_SECRET) {
  missing.push("GITLAB_OAUTH_APP_SECRET");
}

if (missing.length > 0) {
  console.error("[env-check] Missing required variables:");
  for (const key of new Set(missing)) {
    console.error(` - ${key}`);
  }
  process.exit(1);
}

if (blockers.length > 0) {
  console.error("[env-check] Invalid production configuration:");
  for (const error of blockers) {
    console.error(` - ${error}`);
  }
  process.exit(1);
}

console.log("[env-check] Environment variables look OK for startup checks.");
