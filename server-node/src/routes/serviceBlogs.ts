import { Router } from "express";
import fs from "fs/promises";
import path from "path";
import { requireAuth } from "../middleware/auth.js";
import { deleteRow, insertRow, selectRows, updateRow } from "../lib/supabaseRest.js";

type BlogStatus = "live" | "draft";

type RawBlogRow = {
  id?: unknown;
  service_id?: unknown;
  title?: unknown;
  slug?: unknown;
  excerpt?: unknown;
  content?: unknown;
  cover_image_url?: unknown;
  status?: unknown;
  published_at?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
};

const router = Router();
const LOCAL_DATA_DIR = path.resolve("data");
const LOCAL_BLOGS_FILE = path.join(LOCAL_DATA_DIR, "service-blogs.json");

const normalizeText = (value: unknown) => String(value ?? "").trim();
const normalizeOptionalText = (value: unknown) => {
  const text = normalizeText(value);
  return text || null;
};
const normalizeStatus = (value: unknown, allowAll = false): BlogStatus | "all" => {
  const status = normalizeText(value).toLowerCase();
  if (allowAll && status === "all") return "all";
  return status === "draft" ? "draft" : "live";
};
const normalizeServiceId = (value: unknown) => {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};
const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

const normalizeSlug = (value: unknown, fallback: string) => {
  const direct = slugify(normalizeText(value));
  if (direct) return direct;
  return slugify(fallback);
};

const stripHtml = (value: string) =>
  value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ");

const buildExcerpt = (excerpt: string | null, content: string) => {
  if (excerpt) return excerpt;
  const plain = stripHtml(content).replace(/\s+/g, " ").trim();
  if (!plain) return "";
  return plain.length > 220 ? `${plain.slice(0, 217)}...` : plain;
};

const normalizeBlogRow = (row: RawBlogRow) => {
  const title = normalizeText(row.title);
  const slug = normalizeSlug(row.slug, title);
  const content = normalizeText(row.content);
  const excerpt = buildExcerpt(normalizeOptionalText(row.excerpt), content);
  return {
    id: Number(row.id),
    service_id: normalizeServiceId(row.service_id),
    title,
    slug,
    excerpt,
    content,
    cover_image_url: normalizeOptionalText(row.cover_image_url),
    status: normalizeStatus(row.status) as BlogStatus,
    published_at: typeof row.published_at === "string" ? row.published_at : null,
    created_at: typeof row.created_at === "string" ? row.created_at : null,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : null,
  };
};

const isDuplicateError = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes("23505") || message.includes("duplicate key");
};

const isSchemaError = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("service_blogs") &&
    (message.includes("does not exist") || message.includes("could not find the table"))
  );
};

type NormalizedBlogRow = ReturnType<typeof normalizeBlogRow>;

const sortBlogRows = (rows: NormalizedBlogRow[]) =>
  [...rows].sort((a, b) => {
    const aTime = Date.parse(a.published_at || a.created_at || "") || 0;
    const bTime = Date.parse(b.published_at || b.created_at || "") || 0;
    return bTime - aTime;
  });

const readLocalBlogs = async (): Promise<NormalizedBlogRow[]> => {
  try {
    const raw = await fs.readFile(LOCAL_BLOGS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((row) => normalizeBlogRow(row as RawBlogRow));
  } catch (error: unknown) {
    const fileError = error as { code?: string };
    if (fileError?.code === "ENOENT") {
      return [];
    }
    throw error;
  }
};

const writeLocalBlogs = async (rows: NormalizedBlogRow[]) => {
  await fs.mkdir(LOCAL_DATA_DIR, { recursive: true });
  await fs.writeFile(LOCAL_BLOGS_FILE, JSON.stringify(rows, null, 2), "utf8");
};

const getNextLocalBlogId = (rows: NormalizedBlogRow[]) =>
  rows.reduce((maxId, row) => Math.max(maxId, Number(row.id) || 0), 0) + 1;

const buildBlogPatch = (body: unknown, requireCore = false) => {
  const source = (body ?? {}) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};

  if (requireCore || "title" in source) {
    const title = normalizeText(source.title);
    if (!title) {
      return { error: "Blog title is required" as const };
    }
    patch.title = title;
  }

  if (requireCore || "content" in source) {
    const content = normalizeText(source.content);
    if (!content) {
      return { error: "Blog content is required" as const };
    }
    patch.content = content;
  }

  if ("service_id" in source || requireCore) {
    patch.service_id = normalizeServiceId(source.service_id);
  }

  const titleForSlug = (patch.title as string | undefined) ?? normalizeText(source.title);
  if ("slug" in source || requireCore) {
    const normalizedSlug = normalizeSlug(source.slug, titleForSlug || "blog");
    if (!normalizedSlug) {
      return { error: "Valid blog slug is required" as const };
    }
    patch.slug = normalizedSlug;
  } else if ("title" in patch) {
    patch.slug = normalizeSlug("", String(patch.title));
  }

  if ("excerpt" in source || requireCore) {
    patch.excerpt = normalizeOptionalText(source.excerpt);
  }

  if ("cover_image_url" in source) {
    patch.cover_image_url = normalizeOptionalText(source.cover_image_url);
  }

  if ("status" in source || requireCore) {
    patch.status = normalizeStatus(source.status) as BlogStatus;
  }

  if ("published_at" in source) {
    const publishedAt = normalizeOptionalText(source.published_at);
    patch.published_at = publishedAt;
  }

  if ((patch.status as BlogStatus | undefined) === "live" && !("published_at" in patch)) {
    patch.published_at = new Date().toISOString();
  }

  if ("content" in patch) {
    const excerpt = normalizeOptionalText(patch.excerpt);
    patch.excerpt = buildExcerpt(excerpt, String(patch.content));
  }

  return { patch };
};

router.get("/service-blogs", async (req, res) => {
  const status = normalizeStatus(req.query.status, true);
  const serviceId = normalizeServiceId(req.query.serviceId);
  const slug = slugify(normalizeText(req.query.slug));
  const limit = Math.min(200, Math.max(1, Number(req.query.limit ?? 120) || 120));

  const filters = [
    "select=id,service_id,title,slug,excerpt,content,cover_image_url,status,published_at,created_at,updated_at",
    `limit=${limit}`,
    "order=published_at.desc.nullslast,created_at.desc",
  ];
  if (status !== "all") {
    filters.push(`status=eq.${encodeURIComponent(status)}`);
  }
  if (serviceId) {
    filters.push(`service_id=eq.${encodeURIComponent(String(serviceId))}`);
  }
  if (slug) {
    filters.push(`slug=eq.${encodeURIComponent(slug)}`);
  }

  try {
    const rows = await selectRows(`/service_blogs?${filters.join("&")}`);
    const items = Array.isArray(rows) ? rows : [];
    return res.json(items.map((row) => normalizeBlogRow(row as RawBlogRow)));
  } catch (error: unknown) {
    if (isSchemaError(error)) {
      const localRows = await readLocalBlogs();
      const filteredRows = sortBlogRows(localRows).filter((row) => {
        if (status !== "all" && row.status !== status) return false;
        if (serviceId && row.service_id !== serviceId) return false;
        if (slug && row.slug !== slug) return false;
        return true;
      });
      return res.json(filteredRows.slice(0, limit));
    }
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to fetch blog posts",
    });
  }
});

router.post("/service-blogs", requireAuth, async (req, res) => {
  const { patch, error } = buildBlogPatch(req.body, true);
  if (error) return res.status(400).json({ message: error });

  try {
    const data = await insertRow("/service_blogs", patch);
    const created = Array.isArray(data) ? data[0] : null;
    if (!created) return res.status(500).json({ message: "Failed to create blog post" });
    return res.status(201).json(normalizeBlogRow(created as RawBlogRow));
  } catch (err: unknown) {
    if (isSchemaError(err)) {
      const rows = await readLocalBlogs();
      const patchData = patch as RawBlogRow;
      const slug = normalizeSlug(patchData.slug, normalizeText(patchData.title));
      if (rows.some((row) => row.slug === slug)) {
        return res.status(409).json({ message: "Blog slug already exists" });
      }
      const now = new Date().toISOString();
      const created = normalizeBlogRow({
        id: getNextLocalBlogId(rows),
        service_id: patchData.service_id,
        title: patchData.title,
        slug,
        excerpt: patchData.excerpt,
        content: patchData.content,
        cover_image_url: patchData.cover_image_url,
        status: patchData.status,
        published_at: patchData.published_at ?? (patchData.status === "live" ? now : null),
        created_at: now,
        updated_at: now,
      });
      rows.push(created);
      await writeLocalBlogs(rows);
      return res.status(201).json(created);
    }
    if (isDuplicateError(err)) {
      return res.status(409).json({ message: "Blog slug already exists" });
    }
    return res.status(500).json({
      message: err instanceof Error ? err.message : "Failed to create blog post",
    });
  }
});

router.patch("/service-blogs/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid blog id" });
  }

  const { patch, error } = buildBlogPatch(req.body, false);
  if (error) return res.status(400).json({ message: error });
  if (!patch || Object.keys(patch).length === 0) {
    return res.status(400).json({ message: "No valid fields provided" });
  }

  try {
    const data = await updateRow(`/service_blogs?id=eq.${encodeURIComponent(String(id))}`, patch);
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(404).json({ message: "Blog post not found" });
    }
    return res.json(normalizeBlogRow(data[0] as RawBlogRow));
  } catch (err: unknown) {
    if (isSchemaError(err)) {
      const rows = await readLocalBlogs();
      const index = rows.findIndex((row) => row.id === id);
      if (index === -1) {
        return res.status(404).json({ message: "Blog post not found" });
      }

      const now = new Date().toISOString();
      const existing = rows[index];
      const patchData = patch as RawBlogRow;
      const nextSlug = normalizeSlug(
        patchData.slug ?? existing.slug,
        normalizeText(patchData.title ?? existing.title)
      );
      if (rows.some((row) => row.id !== id && row.slug === nextSlug)) {
        return res.status(409).json({ message: "Blog slug already exists" });
      }

      const merged: RawBlogRow = {
        ...existing,
        ...patchData,
        id,
        slug: nextSlug,
        published_at:
          patchData.published_at ??
          ((patchData.status as BlogStatus | undefined) === "live" && !existing.published_at
            ? now
            : existing.published_at),
        updated_at: now,
      };
      rows[index] = normalizeBlogRow(merged);
      await writeLocalBlogs(rows);
      return res.json(rows[index]);
    }
    if (isDuplicateError(err)) {
      return res.status(409).json({ message: "Blog slug already exists" });
    }
    return res.status(500).json({
      message: err instanceof Error ? err.message : "Failed to update blog post",
    });
  }
});

router.delete("/service-blogs/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid blog id" });
  }

  try {
    const existing = await selectRows(`/service_blogs?id=eq.${encodeURIComponent(String(id))}&select=id&limit=1`);
    if (!Array.isArray(existing) || existing.length === 0) {
      return res.status(404).json({ message: "Blog post not found" });
    }

    await deleteRow(`/service_blogs?id=eq.${encodeURIComponent(String(id))}`);
    return res.status(204).end();
  } catch (error: unknown) {
    if (isSchemaError(error)) {
      const rows = await readLocalBlogs();
      const index = rows.findIndex((row) => row.id === id);
      if (index === -1) {
        return res.status(404).json({ message: "Blog post not found" });
      }
      rows.splice(index, 1);
      await writeLocalBlogs(rows);
      return res.status(204).end();
    }
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to delete blog post",
    });
  }
});

export default router;
