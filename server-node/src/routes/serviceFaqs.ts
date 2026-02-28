import { Router } from "express";
import fs from "fs/promises";
import path from "path";
import { requireAuth } from "../middleware/auth.js";
import { deleteRow, insertRow, selectRows, updateRow } from "../lib/supabaseRest.js";

type FaqStatus = "live" | "draft";

type RawFaqRow = {
  id?: unknown;
  service_id?: unknown;
  question?: unknown;
  answer?: unknown;
  status?: unknown;
  display_order?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
};

const router = Router();
const LOCAL_DATA_DIR = path.resolve("data");
const LOCAL_FAQS_FILE = path.join(LOCAL_DATA_DIR, "service-faqs.json");

const normalizeText = (value: unknown) => String(value ?? "").trim();
const normalizeOptionalText = (value: unknown) => {
  const text = normalizeText(value);
  return text || null;
};
const normalizeStatus = (value: unknown, allowAll = false): FaqStatus | "all" => {
  const status = normalizeText(value).toLowerCase();
  if (allowAll && status === "all") return "all";
  return status === "draft" ? "draft" : "live";
};

const normalizeServiceId = (value: unknown) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const normalizeDisplayOrder = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.floor(parsed));
};

const normalizeFaqRow = (row: RawFaqRow) => {
  const serviceId = normalizeServiceId(row.service_id) ?? 0;
  return {
    id: Number(row.id),
    service_id: serviceId,
    question: normalizeText(row.question),
    answer: normalizeText(row.answer),
    status: normalizeStatus(row.status) as FaqStatus,
    display_order: normalizeDisplayOrder(row.display_order),
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
    message.includes("service_faqs") &&
    (message.includes("does not exist") || message.includes("could not find the table"))
  );
};

type NormalizedFaqRow = ReturnType<typeof normalizeFaqRow>;

const sortFaqRows = (rows: NormalizedFaqRow[]) =>
  [...rows].sort((a, b) => {
    if (a.service_id !== b.service_id) return a.service_id - b.service_id;
    if (a.display_order !== b.display_order) return a.display_order - b.display_order;
    const aTime = Date.parse(a.created_at || "") || 0;
    const bTime = Date.parse(b.created_at || "") || 0;
    return bTime - aTime;
  });

const readLocalFaqs = async (): Promise<NormalizedFaqRow[]> => {
  try {
    const raw = await fs.readFile(LOCAL_FAQS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((row) => normalizeFaqRow(row as RawFaqRow));
  } catch (error: unknown) {
    const fileError = error as { code?: string };
    if (fileError?.code === "ENOENT") return [];
    throw error;
  }
};

const writeLocalFaqs = async (rows: NormalizedFaqRow[]) => {
  await fs.mkdir(LOCAL_DATA_DIR, { recursive: true });
  await fs.writeFile(LOCAL_FAQS_FILE, JSON.stringify(rows, null, 2), "utf8");
};

const getNextLocalFaqId = (rows: NormalizedFaqRow[]) =>
  rows.reduce((maxId, row) => Math.max(maxId, Number(row.id) || 0), 0) + 1;

const buildFaqPatch = (body: unknown, requireBaseFields = false) => {
  const source = (body ?? {}) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};

  if (requireBaseFields || "service_id" in source) {
    const serviceId = normalizeServiceId(source.service_id);
    if (!serviceId) {
      return { error: "Valid service_id is required" as const };
    }
    patch.service_id = serviceId;
  }

  if (requireBaseFields || "question" in source) {
    const question = normalizeText(source.question);
    if (!question) {
      return { error: "Question is required" as const };
    }
    patch.question = question;
  }

  if (requireBaseFields || "answer" in source) {
    const answer = normalizeText(source.answer);
    if (!answer) {
      return { error: "Answer is required" as const };
    }
    patch.answer = answer;
  }

  if (requireBaseFields || "status" in source) {
    patch.status = normalizeStatus(source.status) as FaqStatus;
  }

  if ("display_order" in source || requireBaseFields) {
    patch.display_order = normalizeDisplayOrder(source.display_order);
  }

  return { patch };
};

router.get("/service-faqs", async (req, res) => {
  const status = normalizeStatus(req.query.status, true);
  const serviceId = normalizeServiceId(req.query.serviceId);

  const filters = [
    "select=id,service_id,question,answer,status,display_order,created_at,updated_at",
    "order=display_order.asc,created_at.desc",
  ];
  if (status !== "all") {
    filters.push(`status=eq.${encodeURIComponent(status)}`);
  }
  if (serviceId) {
    filters.push(`service_id=eq.${encodeURIComponent(String(serviceId))}`);
  }

  try {
    const rows = await selectRows(`/service_faqs?${filters.join("&")}`);
    const items = Array.isArray(rows) ? rows : [];
    return res.json(items.map((row) => normalizeFaqRow(row as RawFaqRow)));
  } catch (error: unknown) {
    if (isSchemaError(error)) {
      const localRows = await readLocalFaqs();
      const filteredRows = sortFaqRows(localRows).filter((row) => {
        if (status !== "all" && row.status !== status) return false;
        if (serviceId && row.service_id !== serviceId) return false;
        return true;
      });
      return res.json(filteredRows);
    }
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to fetch FAQs",
    });
  }
});

router.post("/service-faqs", requireAuth, async (req, res) => {
  const { patch, error } = buildFaqPatch(req.body, true);
  if (error) return res.status(400).json({ message: error });

  try {
    const data = await insertRow("/service_faqs", patch);
    const created = Array.isArray(data) ? data[0] : null;
    if (!created) return res.status(500).json({ message: "Failed to create FAQ" });
    return res.status(201).json(normalizeFaqRow(created as RawFaqRow));
  } catch (err: unknown) {
    if (isSchemaError(err)) {
      const rows = await readLocalFaqs();
      const patchData = patch as RawFaqRow;
      const duplicate = rows.some(
        (row) =>
          row.service_id === normalizeServiceId(patchData.service_id) &&
          row.question.toLowerCase() === normalizeText(patchData.question).toLowerCase()
      );
      if (duplicate) {
        return res.status(409).json({ message: "Duplicate FAQ detected" });
      }
      const now = new Date().toISOString();
      const created = normalizeFaqRow({
        id: getNextLocalFaqId(rows),
        service_id: patchData.service_id,
        question: patchData.question,
        answer: patchData.answer,
        status: patchData.status,
        display_order: patchData.display_order,
        created_at: now,
        updated_at: now,
      });
      rows.push(created);
      await writeLocalFaqs(rows);
      return res.status(201).json(created);
    }
    if (isDuplicateError(err)) {
      return res.status(409).json({ message: "Duplicate FAQ detected" });
    }
    return res.status(500).json({
      message: err instanceof Error ? err.message : "Failed to create FAQ",
    });
  }
});

router.patch("/service-faqs/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid FAQ id" });
  }

  const { patch, error } = buildFaqPatch(req.body, false);
  if (error) return res.status(400).json({ message: error });
  if (!patch || Object.keys(patch).length === 0) {
    return res.status(400).json({ message: "No valid fields provided" });
  }

  try {
    const data = await updateRow(`/service_faqs?id=eq.${encodeURIComponent(String(id))}`, patch);
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(404).json({ message: "FAQ not found" });
    }
    return res.json(normalizeFaqRow(data[0] as RawFaqRow));
  } catch (err: unknown) {
    if (isSchemaError(err)) {
      const rows = await readLocalFaqs();
      const index = rows.findIndex((row) => row.id === id);
      if (index === -1) {
        return res.status(404).json({ message: "FAQ not found" });
      }

      const existing = rows[index];
      const patchData = patch as RawFaqRow;
      const nextServiceId =
        normalizeServiceId(patchData.service_id) ?? normalizeServiceId(existing.service_id) ?? 0;
      const nextQuestion = normalizeText(patchData.question ?? existing.question);
      const duplicate = rows.some(
        (row) =>
          row.id !== id &&
          row.service_id === nextServiceId &&
          row.question.toLowerCase() === nextQuestion.toLowerCase()
      );
      if (duplicate) {
        return res.status(409).json({ message: "Duplicate FAQ detected" });
      }

      rows[index] = normalizeFaqRow({
        ...existing,
        ...patchData,
        id,
        updated_at: new Date().toISOString(),
      });
      await writeLocalFaqs(rows);
      return res.json(rows[index]);
    }
    return res.status(500).json({
      message: err instanceof Error ? err.message : "Failed to update FAQ",
    });
  }
});

router.delete("/service-faqs/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid FAQ id" });
  }

  try {
    const existing = await selectRows(`/service_faqs?id=eq.${encodeURIComponent(String(id))}&select=id&limit=1`);
    if (!Array.isArray(existing) || existing.length === 0) {
      return res.status(404).json({ message: "FAQ not found" });
    }

    await deleteRow(`/service_faqs?id=eq.${encodeURIComponent(String(id))}`);
    return res.status(204).end();
  } catch (error: unknown) {
    if (isSchemaError(error)) {
      const rows = await readLocalFaqs();
      const index = rows.findIndex((row) => row.id === id);
      if (index === -1) {
        return res.status(404).json({ message: "FAQ not found" });
      }
      rows.splice(index, 1);
      await writeLocalFaqs(rows);
      return res.status(204).end();
    }
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to delete FAQ",
    });
  }
});

export default router;
