export function isPostgresStoreConfigured(): boolean {
  return Boolean(getPostgresConnectionString());
}

export function getPostgresConnectionString(): string | undefined {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    return undefined;
  }

  try {
    const parsed = new URL(databaseUrl);
    return parsed.protocol === "postgres:" || parsed.protocol === "postgresql:"
      ? databaseUrl
      : undefined;
  } catch {
    return undefined;
  }
}
