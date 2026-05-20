export const isProductionRuntime =
  process.env.NODE_ENV === "production"
  || process.env.VERCEL_ENV === "production"
  || process.env.RAILWAY_ENVIRONMENT === "production";

export type DataStoreMode = "file" | "supabase" | "postgres";

export function getDataStoreMode(): DataStoreMode {
  if (process.env.DATA_STORE === "supabase" || process.env.DATA_STORE === "postgres") {
    return process.env.DATA_STORE;
  }

  return "file";
}

export function usesUnsafeLocalDataStoreInProduction(): boolean {
  return isProductionRuntime && getDataStoreMode() === "file";
}

export function unsupportedPostgresStoreError(feature: string): Error {
  return new Error(`${feature} does not support DATA_STORE=postgres yet`);
}
