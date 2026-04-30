import { NextResponse } from "next/server";
import { getAuthMode } from "../../../lib/auth";
import { isSupabaseAuthConfigured } from "../../../lib/supabase-server";
import { getDataStoreMode, usesUnsafeLocalDataStoreInProduction } from "../../../lib/runtime";

export async function GET() {
  const authMode = getAuthMode();
  const dataStore = getDataStoreMode();
  const authReady = authMode === "local" || isSupabaseAuthConfigured();
  const fileStoreUnsafe = usesUnsafeLocalDataStoreInProduction();
  const providerConfigReady = Boolean(process.env.CHANGETHIS_SECRET_KEY);
  const checks = {
    auth: authReady,
    dataStore: !fileStoreUnsafe,
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
    { status: ok ? 200 : 503 }
  );
}
