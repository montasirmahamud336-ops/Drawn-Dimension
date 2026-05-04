import { Pool, type QueryResult, type QueryResultRow } from "pg";
import { env } from "./config/env.js";

export const isDatabaseConfigured = () => env.databaseUrl.trim().length > 0;

let pool: Pool | null = null;

const getPool = () => {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!pool) {
    pool = new Pool({
      connectionString: env.databaseUrl,
      ssl: env.databaseSsl ? { rejectUnauthorized: false } : false
    });
  }

  return pool;
};

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const result = await getPool().query<T>(text, params);
  return result;
}
