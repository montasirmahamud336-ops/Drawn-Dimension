import { Router } from "express";
import fs from "fs/promises";
import path from "path";
import { requireAuth } from "../middleware/auth.js";
import { insertRow, selectRows, updateRow } from "../lib/supabaseRest.js";
import { SERVER_DATA_DIR } from "../lib/runtimePaths.js";

type HeaderFooterLink = {
  id: string;
  label: string;
  href: string;
};

type HeaderFooterSettings = {
  header_links: HeaderFooterLink[];
  footer_links: HeaderFooterLink[];
  header_service_order: number[];
  footer_service_order: number[];
  updated_at: string | null;
  needs_migration?: boolean;
};

type RawSettingsRow = {
  id?: unknown;
  header_links?: unknown;
  footer_links?: unknown;
  header_service_order?: unknown;
  footer_service_order?: unknown;
  updated_at?: unknown;
  created_at?: unknown;
};

const router = Router();
const LOCAL_DATA_DIR = SERVER_DATA_DIR;
const LOCAL_SETTINGS_FILE = path.join(LOCAL_DATA_DIR, "header-footer-settings.json");

const DEFAULT_HEADER_LINKS: HeaderFooterLink[] = [
  { id: "home", label: "Home", href: "/" },
  { id: "about", label: "About", href: "/about" },
  { id: "services", label: "Services", href: "/services" },
  { id: "products", label: "Products", href: "/products" },
  { id: "our-works", label: "Our Works", href: "/portfolio" },
  { id: "reviews", label: "Reviews", href: "/testimonials" },
  { id: "contact", label: "Contact", href: "/contact" },
];

const DEFAULT_FOOTER_LINKS: HeaderFooterLink[] = [
  { id: "about-us", label: "About Us", href: "/about" },
  { id: "our-portfolio", label: "Our Portfolio", href: "/portfolio" },
  { id: "testimonials", label: "Testimonials", href: "/testimonials" },
  { id: "faq", label: "FAQ", href: "/faq" },
  { id: "blog", label: "Blog", href: "/blog" },
  { id: "contact", label: "Contact", href: "/contact" },
];

const normalizeText = (value: unknown) => String(value ?? "").trim();
const normalizeOrderList = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];
  const unique = new Set<number>();
  for (const item of value) {
    const id = Number(item);
    if (!Number.isInteger(id) || id <= 0) continue;
    unique.add(id);
  }
  return Array.from(unique);
};

const normalizeId = (value: unknown, fallbackPrefix: string, index: number) => {
  const candidate = normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return candidate || `${fallbackPrefix}-${index + 1}`;
};

const cloneLinks = (items: HeaderFooterLink[]) => items.map((item) => ({ ...item }));

const normalizeLinks = (
  value: unknown,
  fallback: HeaderFooterLink[],
  fallbackPrefix: "header" | "footer"
): HeaderFooterLink[] => {
  if (!Array.isArray(value)) {
    return cloneLinks(fallback);
  }

  const result: HeaderFooterLink[] = [];
  const seenIds = new Set<string>();

  for (let index = 0; index < value.length; index += 1) {
    const rawItem = value[index];
    if (!rawItem || typeof rawItem !== "object") continue;

    const item = rawItem as Partial<HeaderFooterLink>;
    const label = normalizeText(item.label);
    const href = normalizeText(item.href);
    if (!label || !href) continue;

    const baseId = normalizeId(item.id ?? label, fallbackPrefix, index);
    let id = baseId;
    let suffix = 1;
    while (seenIds.has(id)) {
      suffix += 1;
      id = `${baseId}-${suffix}`;
    }
    seenIds.add(id);
    result.push({ id, label, href });
  }

  if (result.length === 0) {
    return cloneLinks(fallback);
  }

  return result;
};

const normalizeSettings = (row: Partial<RawSettingsRow> | null | undefined): HeaderFooterSettings => ({
  header_links: normalizeLinks(row?.header_links, DEFAULT_HEADER_LINKS, "header"),
  footer_links: normalizeLinks(row?.footer_links, DEFAULT_FOOTER_LINKS, "footer"),
  header_service_order: normalizeOrderList(row?.header_service_order),
  footer_service_order: normalizeOrderList(row?.footer_service_order),
  updated_at: typeof row?.updated_at === "string" ? row.updated_at : null,
});

const isSchemaError = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    (message.includes("header_footer_settings") &&
      (message.includes("pgrst205") ||
        message.includes("could not find the table") ||
        message.includes("does not exist"))) ||
    ((message.includes("footer_service_order") || message.includes("header_service_order")) &&
      message.includes("column"))
  );
};

const readLocalSettings = async (): Promise<HeaderFooterSettings> => {
  try {
    const raw = await fs.readFile(LOCAL_SETTINGS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return normalizeSettings(null);
    }
    return normalizeSettings(parsed as Partial<RawSettingsRow>);
  } catch (error: unknown) {
    const fileError = error as { code?: string };
    if (fileError?.code === "ENOENT") {
      return normalizeSettings(null);
    }
    throw error;
  }
};

const writeLocalSettings = async (settings: HeaderFooterSettings) => {
  const payload = {
    header_links: settings.header_links,
    footer_links: settings.footer_links,
    header_service_order: settings.header_service_order,
    footer_service_order: settings.footer_service_order,
    updated_at: settings.updated_at,
  };
  await fs.mkdir(LOCAL_DATA_DIR, { recursive: true });
  await fs.writeFile(LOCAL_SETTINGS_FILE, JSON.stringify(payload, null, 2), "utf8");
};

const getDbSettings = async (): Promise<HeaderFooterSettings | null> => {
  const rows = await selectRows(
    "/header_footer_settings?select=id,header_links,footer_links,header_service_order,footer_service_order,updated_at&id=eq.1&limit=1"
  );

  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  return normalizeSettings(rows[0] as Partial<RawSettingsRow>);
};

const buildPatch = (body: unknown) => {
  const source = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const patch: Partial<
    Pick<HeaderFooterSettings, "header_links" | "footer_links" | "header_service_order" | "footer_service_order">
  > = {};

  if ("header_links" in source) {
    patch.header_links = normalizeLinks(source.header_links, DEFAULT_HEADER_LINKS, "header");
  }

  if ("footer_links" in source) {
    patch.footer_links = normalizeLinks(source.footer_links, DEFAULT_FOOTER_LINKS, "footer");
  }

  if ("header_service_order" in source) {
    patch.header_service_order = normalizeOrderList(source.header_service_order);
  }

  if ("footer_service_order" in source) {
    patch.footer_service_order = normalizeOrderList(source.footer_service_order);
  }

  if (
    !("header_links" in patch) &&
    !("footer_links" in patch) &&
    !("header_service_order" in patch) &&
    !("footer_service_order" in patch)
  ) {
    return { error: "No valid fields provided" as const };
  }

  return { patch };
};

router.get("/header-footer-settings", async (_req, res) => {
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
      message: error instanceof Error ? error.message : "Failed to fetch header and footer settings",
    });
  }
});

router.patch("/header-footer-settings", requireAuth, async (req, res) => {
  const { patch, error } = buildPatch(req.body);
  if (error) {
    return res.status(400).json({ message: error });
  }

  const now = new Date().toISOString();
  const localCurrent = await readLocalSettings();

  try {
    const dbCurrent = await getDbSettings();
    const base = dbCurrent ?? localCurrent;
    const merged = normalizeSettings({
      header_links: patch.header_links ?? base.header_links,
      footer_links: patch.footer_links ?? base.footer_links,
      header_service_order: patch.header_service_order ?? base.header_service_order,
      footer_service_order: patch.footer_service_order ?? base.footer_service_order,
      updated_at: now,
    });

    let saved = merged;

    if (dbCurrent) {
      const updatedRows = await updateRow("/header_footer_settings?id=eq.1", {
        header_links: merged.header_links,
        footer_links: merged.footer_links,
        header_service_order: merged.header_service_order,
        footer_service_order: merged.footer_service_order,
        updated_at: now,
      });
      if (Array.isArray(updatedRows) && updatedRows.length > 0) {
        saved = normalizeSettings(updatedRows[0] as Partial<RawSettingsRow>);
      }
    } else {
      const createdRows = await insertRow("/header_footer_settings", {
        id: 1,
        header_links: merged.header_links,
        footer_links: merged.footer_links,
        header_service_order: merged.header_service_order,
        footer_service_order: merged.footer_service_order,
        created_at: now,
        updated_at: now,
      });
      if (Array.isArray(createdRows) && createdRows.length > 0) {
        saved = normalizeSettings(createdRows[0] as Partial<RawSettingsRow>);
      }
    }

    await writeLocalSettings(saved);
    return res.json(saved);
  } catch (saveError: unknown) {
    if (isSchemaError(saveError)) {
      const merged = normalizeSettings({
        header_links: patch.header_links ?? localCurrent.header_links,
        footer_links: patch.footer_links ?? localCurrent.footer_links,
        header_service_order: patch.header_service_order ?? localCurrent.header_service_order,
        footer_service_order: patch.footer_service_order ?? localCurrent.footer_service_order,
        updated_at: now,
      });
      await writeLocalSettings(merged);
      return res.json({ ...merged, needs_migration: true });
    }

    return res.status(500).json({
      message: saveError instanceof Error ? saveError.message : "Failed to save header and footer settings",
    });
  }
});

export default router;
