import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { isDatabaseConfigured, query } from "../db.js";

const router = Router();

interface WorldMapSettingsRow {
  id: number;
  country_codes: string[] | null;
  updated_at: string | null;
}

const sanitizeCountryCodes = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const unique = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }

    const normalized = item.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(normalized)) {
      continue;
    }

    unique.add(normalized);
  }

  return Array.from(unique).sort((a, b) => a.localeCompare(b));
};

const mapSettingsResponse = (row: Partial<WorldMapSettingsRow> | null | undefined) => ({
  country_codes: sanitizeCountryCodes(row?.country_codes ?? []),
  updated_at: row?.updated_at ?? null
});

const isMissingSettingsTableError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("global_reach_settings")
    && (message.includes("does not exist") || message.includes("relation"))
  );
};

const getCurrentSettings = async (): Promise<WorldMapSettingsRow | null> => {
  const result = await query<WorldMapSettingsRow>(
    `
      select id, country_codes, updated_at
      from public.global_reach_settings
      where id = 1
      limit 1
    `
  );
  return result.rows[0] ?? null;
};

router.get("/world-map-settings", async (_req, res) => {
  try {
    if (!isDatabaseConfigured()) {
      return res.status(503).json({
        message: "DATABASE_URL is not configured for the local Node API"
      });
    }

    const row = await getCurrentSettings();
    return res.json(mapSettingsResponse(row));
  } catch (error: any) {
    if (isMissingSettingsTableError(error)) {
      return res.json({
        ...mapSettingsResponse(null),
        needs_migration: true
      });
    }

    return res.status(500).json({ message: error?.message || "Failed to fetch world map settings" });
  }
});

router.patch("/world-map-settings", requireAuth, async (req, res) => {
  try {
    if (!isDatabaseConfigured()) {
      return res.status(503).json({
        message: "DATABASE_URL is not configured for the local Node API"
      });
    }

    const countryCodes = sanitizeCountryCodes(req.body?.country_codes);
    const timestamp = new Date().toISOString();
    const payload = {
      country_codes: countryCodes,
      updated_at: timestamp
    };

    const existing = await getCurrentSettings();

    if (!existing) {
      const createdResult = await query<WorldMapSettingsRow>(
        `
          insert into public.global_reach_settings (id, country_codes, created_at, updated_at)
          values (1, $1::text[], $2::timestamptz, $2::timestamptz)
          returning id, country_codes, updated_at
        `,
        [countryCodes, timestamp]
      );

      const created = createdResult.rows[0];
      return res.json(mapSettingsResponse(created ?? payload));
    }

    const updatedResult = await query<WorldMapSettingsRow>(
      `
        update public.global_reach_settings
        set country_codes = $1::text[], updated_at = $2::timestamptz
        where id = 1
        returning id, country_codes, updated_at
      `,
      [countryCodes, timestamp]
    );

    const updated = updatedResult.rows[0];
    return res.json(mapSettingsResponse(updated ?? payload));
  } catch (error: any) {
    if (isMissingSettingsTableError(error)) {
      return res.status(503).json({
        message: "global_reach_settings table is missing in PostgreSQL. Create the table on your VPS database first."
      });
    }

    return res.status(500).json({ message: error?.message || "Failed to save world map settings" });
  }
});

export default router;
