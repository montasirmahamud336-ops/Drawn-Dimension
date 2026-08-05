import { Router } from "express";
import fs from "fs/promises";
import path from "path";
import { requireAuth, requireOwner } from "../middleware/auth.js";
import { executeSql, selectRows } from "../lib/database.js";
import { SERVER_DATA_DIR } from "../lib/runtimePaths.js";
import { env } from "../config/env.js";
import { isSecurityTestMode } from "../lib/securityTestMode.js";

const router = Router();

const KNOWN_TABLES = [
  "users",
  "website_users",
  "projects",
  "team",
  "products",
  "services",
  "service_faqs",
  "service_blogs",
  "reviews",
  "work_assignments",
  "employee_invoices",
  "inquiries",
  "advance_requests",
  "form_messages",
  "live_chat_requests",
  "home_page_settings",
  "header_footer_settings",
  "world_map_settings",
  "system_versions"
];

// Helper to escape SQL values cleanly
const escapeSqlValue = (val: unknown): string => {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (typeof val === "object") {
    const jsonStr = JSON.stringify(val).replace(/'/g, "''");
    return `'${jsonStr}'`;
  }
  const str = String(val).replace(/'/g, "''");
  return `'${str}'`;
};

// Fetch data from Postgres or fallback JSON files
const fetchTableData = async (tableName: string): Promise<Record<string, unknown>[]> => {
  try {
    const res = await selectRows(`/${tableName}`);
    if (Array.isArray(res)) {
      return res as Record<string, unknown>[];
    }
  } catch {
    // Try reading local server JSON file if table query fails
    try {
      const filePath = path.join(SERVER_DATA_DIR, `${tableName.replace(/_/g, "-")}.json`);
      const raw = await fs.readFile(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as Record<string, unknown>[];
      if (parsed && typeof parsed === "object") return [parsed as Record<string, unknown>];
    } catch {
      // return empty array
    }
  }
  return [];
};

// GET /database-backup/stats
router.get("/database-backup/stats", requireAuth, requireOwner, async (_req, res) => {
  if (isSecurityTestMode()) {
    return res.json({ engine: "Test", tables_count: 0, total_records: 0, timestamp: new Date().toISOString(), tables: [] });
  }
  try {
    const tableStats: { name: string; rowCount: number; status: string }[] = [];
    let totalRecords = 0;

    for (const table of KNOWN_TABLES) {
      const data = await fetchTableData(table);
      const rowCount = data.length;
      totalRecords += rowCount;
      tableStats.push({
        name: table,
        rowCount,
        status: "Available"
      });
    }

    res.json({
      engine: env.databaseUrl ? "VPS PostgreSQL" : "Local JSON Datastore",
      database_url: env.databaseUrl ? env.databaseUrl.replace(/:[^:@]+@/, ":***@") : "N/A",
      tables_count: KNOWN_TABLES.length,
      total_records: totalRecords,
      timestamp: new Date().toISOString(),
      tables: tableStats
    });
  } catch (error) {
    console.error("Database backup stats error:", error);
    res.status(500).json({ message: "Failed to fetch database stats" });
  }
});

// GET /database-backup/export-json
router.get("/database-backup/export-json", requireAuth, requireOwner, async (_req, res) => {
  try {
    const databaseDump: Record<string, unknown> = {
      meta: {
        exported_at: new Date().toISOString(),
        engine: env.databaseUrl ? "VPS PostgreSQL" : "Local JSON Datastore",
        platform: "Drawn Dimension Platform",
        version: "v2.5.0"
      },
      tables: {}
    };

    const tablesObj: Record<string, Record<string, unknown>[]> = {};

    for (const table of KNOWN_TABLES) {
      tablesObj[table] = await fetchTableData(table);
    }

    databaseDump.tables = tablesObj;

    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `drawn_dimension_db_backup_${dateStr}.json`;

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(JSON.stringify(databaseDump, null, 2));
  } catch (error) {
    console.error("Database backup export-json error:", error);
    res.status(500).json({ message: "Failed to generate JSON backup" });
  }
});

// GET /database-backup/export-sql
router.get("/database-backup/export-sql", requireAuth, requireOwner, async (_req, res) => {
  try {
    const dateStr = new Date().toISOString().split("T")[0];
    const timeStr = new Date().toISOString();

    let sqlContent = `-- ========================================================\n`;
    sqlContent += `-- Drawn Dimension Platform - Full Database SQL Backup Dump\n`;
    sqlContent += `-- Exported At: ${timeStr}\n`;
    sqlContent += `-- Engine: ${env.databaseUrl ? "VPS PostgreSQL" : "Local JSON Datastore"}\n`;
    sqlContent += `-- ========================================================\n\n`;

    sqlContent += `SET statement_timeout = 0;\n`;
    sqlContent += `SET client_encoding = 'UTF8';\n`;
    sqlContent += `SET standard_conforming_strings = on;\n\n`;

    for (const table of KNOWN_TABLES) {
      const rows = await fetchTableData(table);
      sqlContent += `-- --------------------------------------------------------\n`;
      sqlContent += `-- Table: public.${table} (${rows.length} rows)\n`;
      sqlContent += `-- --------------------------------------------------------\n\n`;

      if (rows.length > 0) {
        const columns = Object.keys(rows[0]);
        const quotedCols = columns.map((c) => `"${c}"`).join(", ");

        sqlContent += `-- Data for ${table}\n`;
        for (const row of rows) {
          const valuesStr = columns.map((col) => escapeSqlValue(row[col])).join(", ");
          sqlContent += `INSERT INTO "${table}" (${quotedCols}) VALUES (${valuesStr}) ON CONFLICT DO NOTHING;\n`;
        }
        sqlContent += `\n`;
      } else {
        sqlContent += `-- (No rows in table ${table})\n\n`;
      }
    }

    const filename = `drawn_dimension_db_backup_${dateStr}.sql`;

    res.setHeader("Content-Type", "application/sql");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(sqlContent);
  } catch (error) {
    console.error("Database backup export-sql error:", error);
    res.status(500).json({ message: "Failed to generate SQL backup dump" });
  }
});

export default router;
