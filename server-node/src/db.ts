import { Pool } from "pg";
import { env } from "./config/env";

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: env.databaseSsl ? { rejectUnauthorized: false } : false
});

export async function query<T>(text: string, params?: unknown[]) {
  const result = await pool.query<T>(text, params);
  return result;
}
