import { NextResponse } from "next/server";
import { getAuthMode } from "../../../lib/auth";
import { isInternalApiConfigured, probeInternalApi } from "../../../lib/internal-api";
import { getDataStoreMode, isProductionRuntime, usesUnsafeLocalDataStoreInProduction } from "../../../lib/runtime";

export async function GET() {
  const authMode = getAuthMode();
  const dataStore = getDataStoreMode();
  const internalMode = authMode === "internal" || dataStore === "internal";
  const authReady = authMode === "local" || isInternalApiConfigured();
  const productionAuthSafe = !isProductionRuntime || authMode === "internal";
  const fileStoreUnsafe = usesUnsafeLocalDataStoreInProduction();
  const internalApiReady = internalMode ? await probeInternalApi("/ready") : true;
  const database = { ok: internalApiReady, failedTables: internalApiReady ? [] : ["internal_api"] };
  const databaseReady = database.ok;
  const providerConfigReady = Boolean(process.env.CHANGETHIS_SECRET_KEY);
  const checks = {
    auth: authReady,
    productionAuth: productionAuthSafe,
    dataStore: !fileStoreUnsafe,
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
