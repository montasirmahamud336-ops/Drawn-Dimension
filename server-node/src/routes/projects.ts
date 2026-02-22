import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { insertRow, selectRows, updateRow, deleteRow } from "../lib/supabaseRest";

const router = Router();

const isMissingDisplayOrderError = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes("display_order") && message.includes("does not exist");
};

const normalizeDisplayOrder = (value: unknown): number | null => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, Math.trunc(numeric));
};

const buildProjectsQuery = (filters: string[], withDisplayOrder: boolean) => {
  const order = withDisplayOrder
    ? "order=display_order.asc.nullslast,created_at.desc"
    : "order=created_at.desc";
  return filters.length ? `?${filters.join("&")}&${order}` : `?${order}`;
};

const getNextProjectDisplayOrder = async (status: string) => {
  try {
    const rows = await selectRows(
      `/projects?status=eq.${encodeURIComponent(status)}&select=display_order&order=display_order.desc.nullslast&limit=1`
    );
    const currentMax = Number(rows?.[0]?.display_order);
    return Number.isFinite(currentMax) ? currentMax + 1 : 0;
  } catch (error) {
    if (isMissingDisplayOrderError(error)) return 0;
    throw error;
  }
};

router.get("/projects", async (req, res) => {
  try {
    const status = String(req.query.status ?? "live");
    const filters: string[] = [];
    if (status !== "all") {
      filters.push(`status=eq.${encodeURIComponent(status)}`);
    }

    const orderedQuery = buildProjectsQuery(filters, true);
    try {
      const data = await selectRows(`/projects${orderedQuery}`);
      return res.json(data ?? []);
    } catch (error) {
      if (!isMissingDisplayOrderError(error)) {
        throw error;
      }

      const fallbackQuery = buildProjectsQuery(filters, false);
      const data = await selectRows(`/projects${fallbackQuery}`);
      return res.json(data ?? []);
    }
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to fetch projects"
    });
  }
});

router.post("/projects", requireAuth, async (req, res) => {
  try {
    const status = String(req.body?.status ?? "live").toLowerCase() === "draft" ? "draft" : "live";
    const parsedDisplayOrder = normalizeDisplayOrder(req.body?.display_order);
    const displayOrder = parsedDisplayOrder ?? await getNextProjectDisplayOrder(status);

    const payload = {
      title: req.body?.title,
      description: req.body?.description ?? null,
      image_url: req.body?.image_url ?? null,
      media: req.body?.media ?? [],
      client: req.body?.client ?? null,
      creator: req.body?.creator ?? null,
      client_name: req.body?.client_name ?? null,
      project_cost: req.body?.project_cost ?? null,
      project_duration: req.body?.project_duration ?? null,
      category: req.body?.category ?? null,
      tags: req.body?.tags ?? [],
      live_link: req.body?.live_link ?? null,
      github_link: req.body?.github_link ?? null,
      status,
      display_order: displayOrder
    };

    let data: any;
    try {
      data = await insertRow("/projects", payload);
    } catch (error) {
      if (!isMissingDisplayOrderError(error)) {
        throw error;
      }
      const { display_order, ...legacyPayload } = payload;
      data = await insertRow("/projects", legacyPayload);
    }
    return res.status(201).json(data?.[0] ?? payload);
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to create project"
    });
  }
});

router.patch("/projects/reorder", requireAuth, async (req, res) => {
  try {
    const rawIds = req.body?.orderedIds;
    if (!Array.isArray(rawIds)) {
      return res.status(400).json({ message: "orderedIds array is required" });
    }

    const orderedIds = rawIds
      .filter((id): id is string => typeof id === "string" && id.trim().length > 0);

    if (orderedIds.length === 0) {
      return res.status(400).json({ message: "orderedIds must include at least one id" });
    }

    await Promise.all(
      orderedIds.map((id, index) =>
        updateRow(`/projects?id=eq.${encodeURIComponent(id)}`, { display_order: index })
      )
    );

    return res.json({ success: true });
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to reorder projects"
    });
  }
});

router.patch("/projects/:id", requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const patch = { ...(req.body ?? {}) } as Record<string, unknown>;
    if ("display_order" in patch) {
      const normalized = normalizeDisplayOrder(patch.display_order);
      patch.display_order = normalized ?? 0;
    }

    const data = await updateRow(`/projects?id=eq.${encodeURIComponent(id)}`, patch);
    return res.json(data?.[0] ?? {});
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to update project"
    });
  }
});

router.delete("/projects/:id", requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    await deleteRow(`/projects?id=eq.${encodeURIComponent(id)}`);
    return res.status(204).end();
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to delete project"
    });
  }
});

export default router;
