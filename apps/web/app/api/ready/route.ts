import { NextResponse } from "next/server";
import { getAuthMode } from "../../../lib/auth";
import { isInternalApiConfigured, probeInternalApi } from "../../../lib/internal-api";
import { isSupabaseAuthConfigured, isSupabaseServiceConfigured, supabaseServiceRest } from "../../../lib/supabase-server";
import { getDataStoreMode, isProductionRuntime, usesUnsafeLocalDataStoreInProduction } from "../../../lib/runtime";

export async function GET() {
  const authMode = getAuthMode();
  const dataStore = getDataStoreMode();
  const internalMode = authMode === "internal" || dataStore === "internal";
  const authReady = authMode === "local" || (authMode === "internal" ? isInternalApiConfigured() : isSupabaseAuthConfigured());
  const productionAuthSafe = !isProductionRuntime || authMode === "supabase" || authMode === "internal";
  const fileStoreUnsafe = usesUnsafeLocalDataStoreInProduction();
  const supabaseStoreConfigured = dataStore !== "supabase" || isSupabaseServiceConfigured();
  const internalApiReady = internalMode ? await probeInternalApi("/ready") : true;
  const database = dataStore === "supabase"
    ? await probeSupabaseDatabase()
    : { ok: internalApiReady, failedTables: internalApiReady ? [] : ["internal_api"] };
  const databaseReady = database.ok;
  const providerConfigReady = Boolean(process.env.CHANGETHIS_SECRET_KEY);
  const checks = {
    auth: authReady,
    productionAuth: productionAuthSafe,
    dataStore: !fileStoreUnsafe,
    supabaseService: supabaseStoreConfigured,
    internalApi: internalApiReady,
    database: databaseReady,
    providerSecrets: providerConfigReady
  };
  const ok = Object.values(checks).every(Boolean);

  return NextResponse.json(
    {
      ok,
      authMode,
      dataStore,
      checks,
      diagnostics: {
        failedTables: database.failedTables
      },
      timestamp: new Date().toISOString()
    },
    {
      headers: {
        "Cache-Control": "no-store"
      },
      status: ok ? 200 : 503
    }
  );
}

async function probeSupabaseDatabase(): Promise<{ ok: boolean; failedTables: string[] }> {
  if (!isSupabaseServiceConfigured()) {
    return { ok: false, failedTables: ["supabase_service"] };
  }

  const tables = [
    "organizations",
    "workspace_members",
    "projects",
    "project_public_keys",
    "feedbacks",
    "feedback_status_events",
    "issue_targets",
    "provider_integrations",
    "provider_integration_credentials",
    "provider_issue_attempts",
    "external_issues",
    "public_launch_waitlist"
  ];
  const results = await Promise.all(tables.map(async (table) => ({
    ok: await canReachSupabaseTable(table),
    table
  })));
  const failedTables = results.filter((result) => !result.ok).map((result) => result.table);

  return {
    ok: failedTables.length === 0,
    failedTables
  };
}

async function canReachSupabaseTable(tableName: string): Promise<boolean> {
  try {
    await probeSupabaseTable(tableName);
    return true;
  } catch {
    return false;
  }
}

async function probeSupabaseTable(tableName: string): Promise<void> {
  await supabaseServiceRest(`/rest/v1/${tableName}?select=id&limit=1`);
}
