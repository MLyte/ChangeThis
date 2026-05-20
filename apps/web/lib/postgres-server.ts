import pg from "pg";

const { Pool } = pg;

type QueryValue = string | number | boolean | Date | null;

let pool: pg.Pool | undefined;

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

export async function postgresQuery<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  values: QueryValue[] = []
): Promise<pg.QueryResult<T>> {
  return getPostgresPool().query<T>(text, values);
}

export async function canReachPostgresTable(tableName: string): Promise<boolean> {
  try {
    await postgresQuery(`select 1 from ${quoteIdentifier(tableName)} limit 1`);
    return true;
  } catch {
    return false;
  }
}

function getPostgresPool(): pg.Pool {
  const connectionString = getPostgresConnectionString();

  if (!connectionString) {
    throw new Error("DATA_STORE=postgres requires DATABASE_URL");
  }

  pool ??= new Pool({
    connectionString,
    max: Number(process.env.POSTGRES_POOL_MAX ?? 5),
    connectionTimeoutMillis: Number(process.env.POSTGRES_CONNECTION_TIMEOUT_MS ?? 5000),
    idleTimeoutMillis: Number(process.env.POSTGRES_IDLE_TIMEOUT_MS ?? 30000)
  });

  return pool;
}

function quoteIdentifier(value: string): string {
  if (!/^[a-z_][a-z0-9_]*$/i.test(value)) {
    throw new Error(`Invalid PostgreSQL identifier: ${value}`);
  }

  return `"${value.replaceAll("\"", "\"\"")}"`;
}
