import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { insertRow, selectRows, updateRow } from "../lib/supabaseRest.js";

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
  return message.includes("pgrst205") && message.includes("global_reach_settings");
};

const getCurrentSettings = async (): Promise<WorldMapSettingsRow | null> => {
  const rows = await selectRows("/global_reach_settings?select=id,country_codes,updated_at&id=eq.1&limit=1");
  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  return rows[0] as WorldMapSettingsRow;
};

router.get("/world-map-settings", async (_req, res) => {
  try {
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
    const countryCodes = sanitizeCountryCodes(req.body?.country_codes);
    const timestamp = new Date().toISOString();
    const payload = {
      country_codes: countryCodes,
      updated_at: timestamp
    };

    const existing = await getCurrentSettings();

    if (!existing) {
      const createdRows = await insertRow("/global_reach_settings", {
        id: 1,
        country_codes: countryCodes,
        created_at: timestamp,
        updated_at: timestamp
      });

      const created = Array.isArray(createdRows) ? (createdRows[0] as Partial<WorldMapSettingsRow> | undefined) : undefined;
      return res.json(mapSettingsResponse(created ?? payload));
    }

    const updatedRows = await updateRow("/global_reach_settings?id=eq.1", payload);
    const updated = Array.isArray(updatedRows) ? (updatedRows[0] as Partial<WorldMapSettingsRow> | undefined) : undefined;
    return res.json(mapSettingsResponse(updated ?? payload));
  } catch (error: any) {
    if (isMissingSettingsTableError(error)) {
      return res.status(503).json({
        message: "global_reach_settings table is missing. Run the latest Supabase migration first."
      });
    }

    return res.status(500).json({ message: error?.message || "Failed to save world map settings" });
  }
});

export default router;
