#!/usr/bin/env node

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const migrationsDir = path.resolve("supabase", "migrations");
const migrationFiles = readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();

const errors = [];
const warnings = [];

if (migrationFiles.length === 0) {
  errors.push("No Supabase migration files found.");
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
  ["organizations table", /create table if not exists organizations/],
  ["workspace members table", /create table if not exists workspace_members/],
  ["projects table", /create table if not exists projects/],
  ["project public keys table", /create table if not exists project_public_keys/],
  ["feedbacks table", /create table if not exists feedbacks/],
  ["feedback status events table", /create table if not exists feedback_status_events/],
  ["issue targets table", /create table if not exists issue_targets/],
  ["provider integrations table", /create table if not exists provider_integrations/],
  ["provider credentials table", /create table if not exists provider_integration_credentials/],
  ["encrypted provider credential fields", /ciphertext/],
  ["provider credential iv field", /\biv\b/],
  ["provider credential tag field", /\btag\b/],
  ["project widget settings", /widget_locale.*widget_button_position.*widget_button_variant/s],
  ["feedback screenshot transition column", /screenshot_data_url/],
  ["project updated_at trigger", /projects_updated_at/],
  ["provider integrations updated_at trigger", /provider_integrations_updated_at/],
];

for (const [label, pattern] of requiredPatterns) {
  if (!pattern.test(allSql)) {
    errors.push(`Missing expected schema coverage: ${label}.`);
  }
}

const advisoryPatterns = [
  ["feedback dashboard index", /feedbacks.*project_id.*status.*created_at|feedbacks.*project_id.*created_at.*status/s],
  ["retry queue index", /retry|next_retry|provider_issue_attempts.*updated_at/s],
  ["screenshot storage path/hash", /screenshot_path.*screenshot_hash|screenshot_hash.*screenshot_path/s],
];

for (const [label, pattern] of advisoryPatterns) {
  if (!pattern.test(allSql)) {
    warnings.push(`Advisory gap for beta scale: ${label}.`);
  }
}

if (warnings.length > 0) {
  console.warn("[migration-check] Warnings:");
  for (const warning of warnings) {
    console.warn(` - ${warning}`);
  }
}

if (errors.length > 0) {
  console.error("[migration-check] Migration validation failed:");
  for (const error of errors) {
    console.error(` - ${error}`);
  }
  process.exit(1);
}

console.log(`[migration-check] ${migrationFiles.length} Supabase migrations look structurally ready.`);
