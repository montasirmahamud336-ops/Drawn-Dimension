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

const buildTeamQuery = (filters: string[], withDisplayOrder: boolean) => {
  const order = withDisplayOrder
    ? "order=display_order.asc.nullslast,created_at.desc"
    : "order=created_at.desc";
  return filters.length ? `?${filters.join("&")}&${order}` : `?${order}`;
};

const getNextTeamDisplayOrder = async (status: string) => {
  try {
    const rows = await selectRows(
      `/team_members?status=eq.${encodeURIComponent(status)}&select=display_order&order=display_order.desc.nullslast&limit=1`
    );
    const currentMax = Number(rows?.[0]?.display_order);
    return Number.isFinite(currentMax) ? currentMax + 1 : 0;
  } catch (error) {
    if (isMissingDisplayOrderError(error)) return 0;
    throw error;
  }
};

router.get("/team", async (req, res) => {
  try {
    const status = String(req.query.status ?? "live");
    const filters: string[] = [];
    if (status !== "all") {
      filters.push(`status=eq.${encodeURIComponent(status)}`);
    }

    const orderedQuery = buildTeamQuery(filters, true);
    try {
      const data = await selectRows(`/team_members${orderedQuery}`);
      return res.json(data ?? []);
    } catch (error) {
      if (!isMissingDisplayOrderError(error)) {
        throw error;
      }

      const fallbackQuery = buildTeamQuery(filters, false);
      const data = await selectRows(`/team_members${fallbackQuery}`);
      return res.json(data ?? []);
    }
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to fetch team members"
    });
  }
});

router.post("/team", requireAuth, async (req, res) => {
  try {
    const status = String(req.body?.status ?? "live").toLowerCase() === "draft" ? "draft" : "live";
    const parsedDisplayOrder = normalizeDisplayOrder(req.body?.display_order);
    const displayOrder = parsedDisplayOrder ?? await getNextTeamDisplayOrder(status);

    const payload = {
      name: req.body?.name,
      role: req.body?.role,
      bio: req.body?.bio ?? null,
      image_url: req.body?.image_url ?? null,
      media: req.body?.media ?? [],
      linkedin_url: req.body?.linkedin_url ?? null,
      twitter_url: req.body?.twitter_url ?? null,
      facebook_url: req.body?.facebook_url ?? null,
      status,
      display_order: displayOrder
    };
    let data: any;
    try {
      data = await insertRow("/team_members", payload);
    } catch (error) {
      if (!isMissingDisplayOrderError(error)) {
        throw error;
      }
      const { display_order, ...legacyPayload } = payload;
      data = await insertRow("/team_members", legacyPayload);
    }
    return res.status(201).json(data?.[0] ?? payload);
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to create team member"
    });
  }
});

router.patch("/team/reorder", requireAuth, async (req, res) => {
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
        updateRow(`/team_members?id=eq.${encodeURIComponent(id)}`, { display_order: index })
      )
    );

    return res.json({ success: true });
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to reorder team members"
    });
  }
});

router.patch("/team/:id", requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const patch = { ...(req.body ?? {}) } as Record<string, unknown>;
    if ("display_order" in patch) {
      const normalized = normalizeDisplayOrder(patch.display_order);
      patch.display_order = normalized ?? 0;
    }

    const data = await updateRow(`/team_members?id=eq.${encodeURIComponent(id)}`, patch);
    return res.json(data?.[0] ?? {});
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to update team member"
    });
  }
});

router.delete("/team/:id", requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    await deleteRow(`/team_members?id=eq.${encodeURIComponent(id)}`);
    return res.status(204).end();
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to delete team member"
    });
  }
});

export default router;
