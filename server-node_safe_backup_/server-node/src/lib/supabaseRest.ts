import { Pool } from "pg";
import { env } from "../config/env.js";

const usePostgres = env.databaseUrl.trim().length > 0;
let pool: Pool | null = null;
const tableMetadataCache = new Map<string, Promise<Map<string, ColumnMetadata>>>();

type ColumnMetadata = {
  name: string;
  dataType: string;
  udtName: string;
};

const assertSupabaseFallbackConfigured = () => {
  if (!env.supabaseUrl.trim() || !env.supabaseServiceKey.trim()) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY are required when DATABASE_URL is not configured");
  }
};

const isPostgresConnectionError = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("econnrefused") ||
    message.includes("connection terminated unexpectedly") ||
    message.includes("database_url") ||
    message.includes("timeout expired") ||
    message.includes("the server closed the connection unexpectedly") ||
    message.includes("failed to connect")
  );
};

async function request(path: string, options: RequestInit = {}) {
  assertSupabaseFallbackConfigured();
  const baseUrl = `${env.supabaseUrl}/rest/v1`;
  const baseHeaders = {
    apikey: env.supabaseServiceKey,
    Authorization: `Bearer ${env.supabaseServiceKey}`,
    "Content-Type": "application/json"
  };

  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...baseHeaders,
      ...(options.headers ?? {})
    }
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Supabase error ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

const quoteIdent = (value: string) => {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
    throw new Error(`Unsupported identifier: ${value}`);
  }
  return `"${value.replaceAll('"', '""')}"`;
};

const isSafeIdentifier = (value: string) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value);

const getPool = () => {
  if (!usePostgres) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!pool) {
    pool = new Pool({
      connectionString: env.databaseUrl,
      ssl: env.databaseSsl ? { rejectUnauthorized: false } : undefined
    });
  }

  return pool;
};

const parsePath = (input: string) => {
  const trimmed = input.trim();
  const [rawPath, rawQuery = ""] = trimmed.split("?");
  const table = rawPath.replace(/^\/+/, "").trim();

  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
    throw new Error(`Unsupported table path: ${input}`);
  }

  return {
    table,
    searchParams: new URLSearchParams(rawQuery)
  };
};

const normalizeScalarValue = (raw: string) => {
  const value = raw.trim().replace(/\*/g, "%");
  if (value === "null") return null;
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }
  return value.replace(/^"(.*)"$/, "$1");
};

const parseInValues = (raw: string) =>
  raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => normalizeScalarValue(item));

const coerceWriteValue = (value: unknown, column: ColumnMetadata) => {
  if (value === undefined) return undefined;
  if (value === null) return null;

  if (column.dataType === "json" || column.dataType === "jsonb") {
    return JSON.stringify(value);
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    return JSON.stringify(value);
  }

  return value;
};

const loadTableMetadata = async (table: string) => {
  const client = getPool();
  const result = await client.query<{
    column_name: string;
    data_type: string;
    udt_name: string;
  }>(
    `
      select column_name, data_type, udt_name
      from information_schema.columns
      where table_schema = 'public' and table_name = $1
      order by ordinal_position asc
    `,
    [table]
  );

  if (result.rows.length === 0) {
    throw new Error(`Table "${table}" does not exist`);
  }

  return new Map(
    result.rows.map((row) => [
      row.column_name,
      {
        name: row.column_name,
        dataType: row.data_type,
        udtName: row.udt_name
      }
    ])
  );
};

const getTableMetadata = async (table: string, forceRefresh = false) => {
  if (forceRefresh) {
    tableMetadataCache.delete(table);
  }

  let pending = tableMetadataCache.get(table);
  if (!pending) {
    pending = loadTableMetadata(table);
    tableMetadataCache.set(table, pending);
  }

  try {
    return await pending;
  } catch (error) {
    tableMetadataCache.delete(table);
    throw error;
  }
};

const buildSelectClause = (selectValue: string | null, metadata: Map<string, ColumnMetadata>) => {
  if (!selectValue || selectValue.trim() === "*" || selectValue.trim().length === 0) {
    return "*";
  }

  const columns = selectValue
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (columns.length === 0) {
    return "*";
  }

  return columns
    .map((column) => {
      if (!metadata.has(column)) {
        throw new Error(`column "${column}" does not exist`);
      }
      return quoteIdent(column);
    })
    .join(", ");
};

const buildWhereClause = (
  searchParams: URLSearchParams,
  metadata: Map<string, ColumnMetadata>,
  startIndex = 1
) => {
  const clauses: string[] = [];
  const values: unknown[] = [];
  let parameterIndex = startIndex;

  for (const [key, rawValue] of searchParams.entries()) {
    if (key === "select" || key === "order" || key === "limit" || key === "offset") {
      continue;
    }

    if (!metadata.has(key)) {
      throw new Error(`column "${key}" does not exist`);
    }

    const column = quoteIdent(key);

    if (rawValue.startsWith("eq.")) {
      const value = normalizeScalarValue(rawValue.slice(3));
      if (value === null) {
        clauses.push(`${column} is null`);
      } else {
        clauses.push(`${column} = $${parameterIndex}`);
        values.push(value);
        parameterIndex += 1;
      }
      continue;
    }

    if (rawValue.startsWith("neq.")) {
      const value = normalizeScalarValue(rawValue.slice(4));
      if (value === null) {
        clauses.push(`${column} is not null`);
      } else {
        clauses.push(`${column} <> $${parameterIndex}`);
        values.push(value);
        parameterIndex += 1;
      }
      continue;
    }

    if (rawValue.startsWith("ilike.")) {
      const value = String(normalizeScalarValue(rawValue.slice(6)) ?? "");
      clauses.push(`${column} ilike $${parameterIndex}`);
      values.push(value);
      parameterIndex += 1;
      continue;
    }

    if (rawValue.startsWith("gt.")) {
      clauses.push(`${column} > $${parameterIndex}`);
      values.push(normalizeScalarValue(rawValue.slice(3)));
      parameterIndex += 1;
      continue;
    }

    if (rawValue.startsWith("gte.")) {
      clauses.push(`${column} >= $${parameterIndex}`);
      values.push(normalizeScalarValue(rawValue.slice(4)));
      parameterIndex += 1;
      continue;
    }

    if (rawValue.startsWith("lt.")) {
      clauses.push(`${column} < $${parameterIndex}`);
      values.push(normalizeScalarValue(rawValue.slice(3)));
      parameterIndex += 1;
      continue;
    }

    if (rawValue.startsWith("lte.")) {
      clauses.push(`${column} <= $${parameterIndex}`);
      values.push(normalizeScalarValue(rawValue.slice(4)));
      parameterIndex += 1;
      continue;
    }

    if (rawValue.startsWith("in.(") && rawValue.endsWith(")")) {
      const inValues = parseInValues(rawValue.slice(4, -1));
      if (inValues.length === 0) {
        clauses.push("1=0");
      } else {
        const placeholders = inValues.map(() => `$${parameterIndex++}`);
        clauses.push(`${column} in (${placeholders.join(", ")})`);
        values.push(...inValues);
      }
      continue;
    }

    if (rawValue === "is.null") {
      clauses.push(`${column} is null`);
      continue;
    }

    if (rawValue === "is.true") {
      clauses.push(`${column} is true`);
      continue;
    }

    if (rawValue === "is.false") {
      clauses.push(`${column} is false`);
      continue;
    }

    throw new Error(`Unsupported filter operator: ${key}=${rawValue}`);
  }

  return {
    sql: clauses.length > 0 ? ` where ${clauses.join(" and ")}` : "",
    values,
    nextIndex: parameterIndex
  };
};

const buildOrderClause = (orderValue: string | null, metadata: Map<string, ColumnMetadata>) => {
  if (!orderValue) return "";

  const clauses = orderValue
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((segment) => {
      const [columnName, ...directives] = segment.split(".").map((part) => part.trim()).filter(Boolean);
      if (!columnName) return "";
      if (!metadata.has(columnName)) {
        throw new Error(`column "${columnName}" does not exist`);
      }

      const direction = directives.includes("desc") ? "DESC" : "ASC";
      const nullHandling = directives.includes("nullslast")
        ? " NULLS LAST"
        : directives.includes("nullsfirst")
          ? " NULLS FIRST"
          : "";

      return `${quoteIdent(columnName)} ${direction}${nullHandling}`;
    })
    .filter(Boolean);

  return clauses.length > 0 ? ` order by ${clauses.join(", ")}` : "";
};

const buildLimitClause = (value: string | null) => {
  if (!value) return "";
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return "";
  return ` limit ${Math.trunc(numeric)}`;
};

const buildOffsetClause = (value: string | null) => {
  if (!value) return "";
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return "";
  return ` offset ${Math.trunc(numeric)}`;
};

const filterPayloadEntries = async (table: string, payload: unknown) => {
  const source = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const keys = Object.keys(source);
  let metadata = await getTableMetadata(table);
  const missingKeys = keys.filter((key) => isSafeIdentifier(key) && !metadata.has(key));

  // Refresh cached column metadata after live schema changes so new fields are not silently dropped.
  if (missingKeys.length > 0) {
    metadata = await getTableMetadata(table, true);
  }

  return Object.entries(source)
    .filter(([key, value]) => metadata.has(key) && value !== undefined)
    .map(([key, value]) => [key, coerceWriteValue(value, metadata.get(key)!)] as const);
};

async function selectRowsFromPostgres(path: string) {
  const { table, searchParams } = parsePath(path);
  const metadata = await getTableMetadata(table);
  const selectClause = buildSelectClause(searchParams.get("select"), metadata);
  const where = buildWhereClause(searchParams, metadata);
  const order = buildOrderClause(searchParams.get("order"), metadata);
  const limit = buildLimitClause(searchParams.get("limit"));
  const offset = buildOffsetClause(searchParams.get("offset"));

  const sql = `select ${selectClause} from public.${quoteIdent(table)}${where.sql}${order}${limit}${offset}`;
  const result = await getPool().query(sql, where.values);
  return result.rows;
}

async function insertRowInPostgres(path: string, payload: unknown) {
  const { table } = parsePath(path);
  const entries = await filterPayloadEntries(table, payload);

  if (entries.length === 0) {
    return [];
  }

  const columns = entries.map(([key]) => quoteIdent(key));
  const placeholders = entries.map((_, index) => `$${index + 1}`);
  const values = entries.map(([, value]) => value);

  const sql = `
    insert into public.${quoteIdent(table)} (${columns.join(", ")})
    values (${placeholders.join(", ")})
    returning *
  `;

  const result = await getPool().query(sql, values);
  return result.rows;
}

async function updateRowInPostgres(path: string, payload: unknown) {
  const { table, searchParams } = parsePath(path);
  const entries = await filterPayloadEntries(table, payload);
  const metadata = await getTableMetadata(table);

  if (entries.length === 0) {
    return [];
  }

  const setClause = entries
    .map(([key], index) => `${quoteIdent(key)} = $${index + 1}`)
    .join(", ");
  const values = entries.map(([, value]) => value);
  const where = buildWhereClause(searchParams, metadata, values.length + 1);

  if (!where.sql) {
    throw new Error("Refusing to update rows without filters");
  }

  const sql = `
    update public.${quoteIdent(table)}
    set ${setClause}
    ${where.sql}
    returning *
  `;

  const result = await getPool().query(sql, [...values, ...where.values]);
  return result.rows;
}

async function deleteRowInPostgres(path: string) {
  const { table, searchParams } = parsePath(path);
  const metadata = await getTableMetadata(table);
  const where = buildWhereClause(searchParams, metadata);

  if (!where.sql) {
    throw new Error("Refusing to delete rows without filters");
  }

  const sql = `delete from public.${quoteIdent(table)}${where.sql} returning *`;
  const result = await getPool().query(sql, where.values);
  return result.rows;
}

const withPostgresFallback = async <T>(
  postgresAction: () => Promise<T>,
  fallbackAction: () => Promise<T>
) => {
  if (!usePostgres) {
    return fallbackAction();
  }

  try {
    return await postgresAction();
  } catch (error) {
    if (!isPostgresConnectionError(error)) {
      throw error;
    }
    return fallbackAction();
  }
};

export async function executeSql<T extends Record<string, unknown> = Record<string, unknown>>(
  sql: string,
  values: unknown[] = []
) {
  if (!usePostgres) {
    throw new Error("DATABASE_URL is required for executeSql");
  }

  return getPool().query<T>(sql, values);
}

export async function selectRows(path: string) {
  return withPostgresFallback(
    () => selectRowsFromPostgres(path),
    () => request(path, { method: "GET" })
  );
}

export async function insertRow(path: string, payload: unknown) {
  return withPostgresFallback(
    () => insertRowInPostgres(path, payload),
    () =>
      request(path, {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(payload)
      })
  );
}

export async function updateRow(path: string, payload: unknown) {
  return withPostgresFallback(
    () => updateRowInPostgres(path, payload),
    () =>
      request(path, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(payload)
      })
  );
}

export async function deleteRow(path: string) {
  return withPostgresFallback(
    () => deleteRowInPostgres(path),
    () => request(path, { method: "DELETE" })
  );
}
