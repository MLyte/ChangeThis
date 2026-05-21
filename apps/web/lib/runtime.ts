export const isProductionRuntime =
  process.env.NODE_ENV === "production"
  || process.env.VERCEL_ENV === "production"
  || process.env.RAILWAY_ENVIRONMENT === "production";

export function getDataStoreMode(): "file" | "supabase" | "internal" {
  if (process.env.DATA_STORE === "supabase" || process.env.DATA_STORE === "internal") {
    return process.env.DATA_STORE;
  }

  return "file";
}

export function usesUnsafeLocalDataStoreInProduction(): boolean {
  return isProductionRuntime && getDataStoreMode() === "file";
}
