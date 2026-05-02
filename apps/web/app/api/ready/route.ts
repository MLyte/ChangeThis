import { NextResponse } from "next/server";
import { getAuthMode } from "../../../lib/auth";
import { isSupabaseAuthConfigured, isSupabaseServiceConfigured, supabaseServiceRest } from "../../../lib/supabase-server";
import { getDataStoreMode, isProductionRuntime, usesUnsafeLocalDataStoreInProduction } from "../../../lib/runtime";

export async function GET() {
  const authMode = getAuthMode();
  const dataStore = getDataStoreMode();
  const authReady = authMode === "local" || isSupabaseAuthConfigured();
  const productionAuthSafe = !isProductionRuntime || authMode === "supabase";
  const fileStoreUnsafe = usesUnsafeLocalDataStoreInProduction();
  const supabaseStoreConfigured = dataStore !== "supabase" || isSupabaseServiceConfigured();
  const databaseReady = dataStore !== "supabase" || await canReachSupabaseDatabase();
  const providerConfigReady = Boolean(process.env.CHANGETHIS_SECRET_KEY);
  const checks = {
    auth: authReady,
    productionAuth: productionAuthSafe,
    dataStore: !fileStoreUnsafe,
    supabaseService: supabaseStoreConfigured,
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

async function canReachSupabaseDatabase(): Promise<boolean> {
  if (!isSupabaseServiceConfigured()) {
    return false;
  }

  try {
    await Promise.all([
      probeSupabaseTable("organizations"),
      probeSupabaseTable("workspace_members"),
      probeSupabaseTable("projects"),
      probeSupabaseTable("project_public_keys"),
      probeSupabaseTable("feedbacks"),
      probeSupabaseTable("feedback_status_events"),
      probeSupabaseTable("issue_targets"),
      probeSupabaseTable("provider_integrations"),
      probeSupabaseTable("provider_integration_credentials"),
      probeSupabaseTable("provider_issue_attempts"),
      probeSupabaseTable("external_issues")
    ]);
    return true;
  } catch {
    return false;
  }
}

async function probeSupabaseTable(tableName: string): Promise<void> {
  await supabaseServiceRest(`/rest/v1/${tableName}?select=id&limit=1`);
}
