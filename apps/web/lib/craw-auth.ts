export function isCrawAuthConfigured(): boolean {
  return Boolean(process.env.CRAW_AUTH_SHARED_SECRET?.trim() || process.env.CRAW_AUTH_JWKS_URL?.trim());
}
