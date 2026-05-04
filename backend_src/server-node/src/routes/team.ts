import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { insertRow, selectRows, updateRow, deleteRow } from "../lib/supabaseRest.js";

const router = Router();

const isMissingDisplayOrderError = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes("display_order") && message.includes("does not exist");
};

const isMissingMemberTypeError = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes("member_type") && message.includes("does not exist");
};

const normalizeDisplayOrder = (value: unknown): number | null => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, Math.trunc(numeric));
};

const normalizeMemberType = (value: unknown) => {
  const raw = String(value ?? "leadership").trim().toLowerCase();
  if (raw === "employee") return "employee";
  if (raw === "all") return "all";
  return "leadership";
};

const buildTeamQuery = (filters: string[], withDisplayOrder: boolean) => {
  const order = withDisplayOrder
    ? "order=display_order.asc.nullslast,created_at.desc"
    : "order=created_at.desc";
  return filters.length ? `?${filters.join("&")}&${order}` : `?${order}`;
};

const getNextTeamDisplayOrder = async (status: string, memberType: "leadership" | "employee") => {
  try {
    const rows = await selectRows(
      `/team_members?status=eq.${encodeURIComponent(status)}&member_type=eq.${encodeURIComponent(memberType)}&select=display_order&order=display_order.desc.nullslast&limit=1`
    );
    const currentMax = Number(rows?.[0]?.display_order);
    return Number.isFinite(currentMax) ? currentMax + 1 : 0;
  } catch (error) {
    if (isMissingMemberTypeError(error)) {
      try {
        const rows = await selectRows(
          `/team_members?status=eq.${encodeURIComponent(status)}&select=display_order&order=display_order.desc.nullslast&limit=1`
        );
        const currentMax = Number(rows?.[0]?.display_order);
        return Number.isFinite(currentMax) ? currentMax + 1 : 0;
      } catch (innerError) {
        if (isMissingDisplayOrderError(innerError)) return 0;
        throw innerError;
      }
    }
    if (isMissingDisplayOrderError(error)) return 0;
    throw error;
  }
};

router.get("/team", async (req, res) => {
  try {
    const status = String(req.query.status ?? "live");
    const memberType = normalizeMemberType(req.query.memberType ?? req.query.type);
    const filters: string[] = [];
    if (status !== "all") {
      filters.push(`status=eq.${encodeURIComponent(status)}`);
    }
    if (memberType !== "all") {
      filters.push(`member_type=eq.${encodeURIComponent(memberType)}`);
    }

    const orderedQuery = buildTeamQuery(filters, true);
    try {
      const data = await selectRows(`/team_members${orderedQuery}`);
      return res.json(data ?? []);
    } catch (error) {
      if (!isMissingDisplayOrderError(error) && !isMissingMemberTypeError(error)) {
        throw error;
      }

      const fallbackFilters = isMissingMemberTypeError(error)
        ? filters.filter((item) => !item.startsWith("member_type=eq."))
        : filters;
      if (memberType === "employee" && isMissingMemberTypeError(error)) {
        return res.json([]);
      }

      const fallbackQuery = buildTeamQuery(fallbackFilters, false);
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
    const memberType = normalizeMemberType(req.body?.member_type) === "employee" ? "employee" : "leadership";
    const parsedDisplayOrder = normalizeDisplayOrder(req.body?.display_order);
    const displayOrder = parsedDisplayOrder ?? await getNextTeamDisplayOrder(status, memberType);

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
      member_type: memberType,
      display_order: displayOrder
    };
    let data: any;
    try {
      data = await insertRow("/team_members", payload);
    } catch (error) {
      if (!isMissingDisplayOrderError(error) && !isMissingMemberTypeError(error)) {
        throw error;
      }

      const legacyPayload: Record<string, unknown> = { ...payload };
      if (isMissingDisplayOrderError(error)) {
        delete legacyPayload.display_order;
      }
      if (isMissingMemberTypeError(error)) {
        delete legacyPayload.member_type;
      }

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

    if ("member_type" in patch) {
      const normalized = normalizeMemberType(patch.member_type);
      patch.member_type = normalized === "employee" ? "employee" : "leadership";
    }

    try {
      const data = await updateRow(`/team_members?id=eq.${encodeURIComponent(id)}`, patch);
      return res.json(data?.[0] ?? {});
    } catch (error) {
      if (!isMissingMemberTypeError(error) && !isMissingDisplayOrderError(error)) {
        throw error;
      }

      const legacyPatch = { ...patch };
      if (isMissingMemberTypeError(error)) {
        delete legacyPatch.member_type;
      }
      if (isMissingDisplayOrderError(error)) {
        delete legacyPatch.display_order;
      }

      const data = await updateRow(`/team_members?id=eq.${encodeURIComponent(id)}`, legacyPatch);
      return res.json(data?.[0] ?? {});
    }
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
