import { Pool, type QueryResult, type QueryResultRow } from "pg";
import { env } from "./config/env.js";

export const pool = new Pool({
  connectionString: env.databaseUrl || undefined,
  ssl: env.databaseSsl ? { rejectUnauthorized: false } : false
});

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const result = await pool.query<T>(text, params);
  return result;
}
