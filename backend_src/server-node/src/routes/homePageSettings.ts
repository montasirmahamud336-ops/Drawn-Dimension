import { Router } from "express";
import fs from "fs/promises";
import path from "path";
import { requireAuth } from "../middleware/auth.js";
import { insertRow, selectRows, updateRow } from "../lib/supabaseRest.js";

type HomePageSettings = {
  section_order: string[];
  sections: Record<string, unknown>;
  updated_at: string | null;
  needs_migration?: boolean;
};

type RawSettingsRow = {
  id?: unknown;
  settings?: unknown;
  updated_at?: unknown;
  created_at?: unknown;
};

const router = Router();
const LOCAL_DATA_DIR = path.resolve("data");
const LOCAL_SETTINGS_FILE = path.join(LOCAL_DATA_DIR, "home-page-settings.json");

const DEFAULT_SETTINGS: HomePageSettings = {
  section_order: [
    "hero",
    "trusted-logos",
    "services",
    "portfolio",
    "global-reach",
    "testimonials",
    "about",
    "why-choose-us",
    "cta",
  ],
  sections: {},
  updated_at: null,
};

const normalizeSettings = (value: unknown): HomePageSettings => {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const settingsSource =
    source.settings && typeof source.settings === "object"
      ? (source.settings as Record<string, unknown>)
      : source;

  const sectionOrder = Array.isArray(settingsSource.section_order)
    ? settingsSource.section_order.map((item) => String(item))
    : DEFAULT_SETTINGS.section_order;

  const sections =
    settingsSource.sections && typeof settingsSource.sections === "object"
      ? (settingsSource.sections as Record<string, unknown>)
      : DEFAULT_SETTINGS.sections;

  return {
    section_order: sectionOrder,
    sections,
    updated_at:
      typeof source.updated_at === "string"
        ? source.updated_at
        : typeof settingsSource.updated_at === "string"
          ? (settingsSource.updated_at as string)
          : null,
  };
};

const isSchemaError = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("home_page_settings") &&
      (message.includes("pgrst205") ||
        message.includes("could not find the table") ||
        message.includes("does not exist")) ||
    (message.includes("settings") && message.includes("column"))
  );
};

const readLocalSettings = async (): Promise<HomePageSettings> => {
  try {
    const raw = await fs.readFile(LOCAL_SETTINGS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return normalizeSettings(parsed);
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return { ...DEFAULT_SETTINGS };
    }
    throw error;
  }
};

const writeLocalSettings = async (settings: HomePageSettings) => {
  await fs.mkdir(LOCAL_DATA_DIR, { recursive: true });
  await fs.writeFile(LOCAL_SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf8");
};

const getDbSettings = async (): Promise<HomePageSettings | null> => {
  const rows = await selectRows("/home_page_settings?select=id,settings,updated_at&id=eq.1&limit=1");
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return normalizeSettings(rows[0] as RawSettingsRow);
};

router.get("/home-page-settings", async (_req, res) => {
  try {
    const dbSettings = await getDbSettings();
    if (dbSettings) {
      return res.json(dbSettings);
    }

    const localSettings = await readLocalSettings();
    return res.json(localSettings);
  } catch (error: unknown) {
    if (isSchemaError(error)) {
      const localSettings = await readLocalSettings();
      return res.json({ ...localSettings, needs_migration: true });
    }

    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to fetch home page settings",
    });
  }
});

router.patch("/home-page-settings", requireAuth, async (req, res) => {
  const now = new Date().toISOString();
  const incoming = req.body?.settings ?? req.body;
  const normalized = normalizeSettings(incoming);
  const cleaned: HomePageSettings = {
    ...normalized,
    updated_at: now,
  };
  delete cleaned.needs_migration;

  try {
    const existing = await getDbSettings();
    let saved = cleaned;

    if (existing) {
      const updatedRows = await updateRow("/home_page_settings?id=eq.1", {
        settings: cleaned,
        updated_at: now,
      });
      if (Array.isArray(updatedRows) && updatedRows.length > 0) {
        saved = normalizeSettings(updatedRows[0] as RawSettingsRow);
      }
    } else {
      const createdRows = await insertRow("/home_page_settings", {
        id: 1,
        settings: cleaned,
        created_at: now,
        updated_at: now,
      });
      if (Array.isArray(createdRows) && createdRows.length > 0) {
        saved = normalizeSettings(createdRows[0] as RawSettingsRow);
      }
    }

    await writeLocalSettings(saved);
    return res.json(saved);
  } catch (error: unknown) {
    if (isSchemaError(error)) {
      await writeLocalSettings(cleaned);
      return res.json({ ...cleaned, needs_migration: true });
    }

    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to save home page settings",
    });
  }
});

export default router;
