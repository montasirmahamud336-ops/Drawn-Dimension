import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { insertRow, selectRows, updateRow, deleteRow } from "../lib/supabaseRest";

const router = Router();

router.get("/team", async (req, res) => {
  const status = String(req.query.status ?? "live");
  const filters: string[] = [];
  if (status !== "all") {
    filters.push(`status=eq.${encodeURIComponent(status)}`);
  }
  const query = filters.length ? `?${filters.join("&")}&order=created_at.desc` : "?order=created_at.desc";
  const data = await selectRows(`/team_members${query}`);
  return res.json(data ?? []);
});

router.post("/team", requireAuth, async (req, res) => {
  const payload = {
    name: req.body?.name,
    role: req.body?.role,
    bio: req.body?.bio ?? null,
    image_url: req.body?.image_url ?? null,
    media: req.body?.media ?? [],
    linkedin_url: req.body?.linkedin_url ?? null,
    twitter_url: req.body?.twitter_url ?? null,
    facebook_url: req.body?.facebook_url ?? null,
    status: req.body?.status ?? "live"
  };
  const data = await insertRow("/team_members", payload);
  return res.status(201).json(data?.[0] ?? payload);
});

router.patch("/team/:id", requireAuth, async (req, res) => {
  const id = req.params.id;
  const data = await updateRow(`/team_members?id=eq.${encodeURIComponent(id)}`, req.body ?? {});
  return res.json(data?.[0] ?? {});
});

router.delete("/team/:id", requireAuth, async (req, res) => {
  const id = req.params.id;
  await deleteRow(`/team_members?id=eq.${encodeURIComponent(id)}`);
  return res.status(204).end();
});

export default router;
