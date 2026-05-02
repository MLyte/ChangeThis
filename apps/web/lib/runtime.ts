export const isProductionRuntime =
  process.env.NODE_ENV === "production"
  || process.env.VERCEL_ENV === "production"
  || process.env.RAILWAY_ENVIRONMENT === "production";

export function getDataStoreMode(): "file" | "supabase" {
  return process.env.DATA_STORE === "supabase" ? "supabase" : "file";
}

export function usesUnsafeLocalDataStoreInProduction(): boolean {
  return isProductionRuntime && getDataStoreMode() === "file";
}
