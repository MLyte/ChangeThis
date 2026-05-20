#!/usr/bin/env node

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const migrationsDir = path.resolve("postgres", "migrations");
const errors = [];
let migrationFiles = [];

try {
  migrationFiles = readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();
} catch {
  errors.push("No postgres/migrations directory found.");
}

if (migrationFiles.length === 0) {
  errors.push("No PostgreSQL migration files found.");
}

for (const [index, file] of migrationFiles.entries()) {
  const expectedPrefix = String(index + 1).padStart(4, "0");
  if (!file.startsWith(`${expectedPrefix}_`)) {
    errors.push(`Migration order is not contiguous: expected ${expectedPrefix}_*.sql at position ${index + 1}, got ${file}.`);
  }
}

const allSql = migrationFiles
  .map((file) => readFileSync(path.join(migrationsDir, file), "utf8"))
  .join("\n")
  .toLowerCase();

const requiredPatterns = [
  ["pgcrypto extension", /create extension if not exists pgcrypto/],
  ["organizations table", /create table if not exists organizations/],
  ["workspace members table", /create table if not exists workspace_members/],
  ["projects table", /create table if not exists projects/],
  ["project public keys table", /create table if not exists project_public_keys/],
  ["feedbacks table", /create table if not exists feedbacks/],
  ["feedback status events table", /create table if not exists feedback_status_events/],
  ["issue targets table", /create table if not exists issue_targets/],
  ["provider integrations table", /create table if not exists provider_integrations/],
  ["provider credentials table", /create table if not exists provider_integration_credentials/],
  ["provider issue attempts table", /create table if not exists provider_issue_attempts/],
  ["external issues table", /create table if not exists external_issues/],
  ["public launch waitlist table", /create table if not exists public_launch_waitlist/],
  ["project widget settings", /widget_locale[\s\S]*widget_button_position[\s\S]*widget_button_variant/],
  ["project reporter setting", /widget_reporter_fields[\s\S]*hidden[\s\S]*optional[\s\S]*required/],
  ["project issue creation mode", /issue_creation_mode[\s\S]*manual[\s\S]*automatic/],
  ["feedback status coverage", /sent_to_provider[\s\S]*resolved[\s\S]*ignored/],
  ["feedback screenshot lifecycle", /screenshot_thumbnail_data_url[\s\S]*screenshot_storage_path[\s\S]*screenshot_status/],
  ["encrypted provider credential fields", /ciphertext[\s\S]*\biv\b[\s\S]*\btag\b/],
  ["feedback dashboard index", /create index if not exists feedbacks_project_status_created_at_idx[\s\S]*on feedbacks \(project_id, status, created_at desc\)/],
  ["updated_at trigger function", /create or replace function public\.set_updated_at\(\)/],
];

for (const [label, pattern] of requiredPatterns) {
  if (!pattern.test(allSql)) {
    errors.push(`Missing expected PostgreSQL schema coverage: ${label}.`);
  }
}

const forbiddenPatterns = [
  ["Supabase auth.uid dependency", /auth\.uid\(/],
  ["Supabase RLS policy", /create policy/],
  ["Supabase authenticated role", /\bto authenticated\b/],
];

for (const [label, pattern] of forbiddenPatterns) {
  if (pattern.test(allSql)) {
    errors.push(`PostgreSQL migrations should stay platform-neutral: ${label}.`);
  }
}

if (errors.length > 0) {
  console.error("[postgres-migration-check] Migration validation failed:");
  for (const error of errors) {
    console.error(` - ${error}`);
  }
  process.exit(1);
}

console.log(`[postgres-migration-check] ${migrationFiles.length} PostgreSQL migrations look structurally ready.`);
