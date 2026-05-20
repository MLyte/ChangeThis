#!/usr/bin/env node

const required = [
  "PUBLIC_APP_URL",
  "DJANGO_SECRET_KEY",
  "DATABASE_URL",
  "FILES_ROOT",
  "TEMP_DIR",
  "ALLOWED_HOSTS",
  "CSRF_TRUSTED_ORIGINS",
];
const placeholderValues = new Set(["change-me", "changeme", "example", "secret", "test", "todo"]);
const raw = process.env;
const missing = [];
const blockers = [];
const isProduction = raw.NODE_ENV === "production" || raw.DJANGO_DEBUG === "false";

for (const key of required) {
  if (!raw[key]) {
    missing.push(key);
  }
}

if (raw.PUBLIC_APP_URL && !/^https?:\/\//.test(raw.PUBLIC_APP_URL)) {
  blockers.push("PUBLIC_APP_URL must start with http:// or https://");
}
if (raw.DATABASE_URL && !/^postgres(?:ql)?:\/\//.test(raw.DATABASE_URL)) {
  blockers.push("DATABASE_URL must start with postgres:// or postgresql://");
}
if (isProduction) {
  if (raw.PUBLIC_APP_URL && !raw.PUBLIC_APP_URL.startsWith("https://") && !raw.PUBLIC_APP_URL.includes("localhost")) {
    blockers.push("PUBLIC_APP_URL should use https:// outside local development");
  }
  if (!raw.DJANGO_SECRET_KEY || raw.DJANGO_SECRET_KEY.length < 32) {
    blockers.push("DJANGO_SECRET_KEY must be at least 32 characters in production");
  }
  if (raw.DJANGO_SECRET_KEY && placeholderValues.has(raw.DJANGO_SECRET_KEY.toLowerCase())) {
    blockers.push("DJANGO_SECRET_KEY uses a placeholder value");
  }
}

if (missing.length > 0) {
  console.error("[env-check] Missing required variables:");
  for (const key of new Set(missing)) {
    console.error(` - ${key}`);
  }
  process.exit(1);
}

if (blockers.length > 0) {
  console.error("[env-check] Invalid CRAW configuration:");
  for (const error of blockers) {
    console.error(` - ${error}`);
  }
  process.exit(1);
}

console.log("[env-check] CRAW environment variables look OK.");
