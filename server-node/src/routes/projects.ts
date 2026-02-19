import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { insertRow, selectRows, updateRow, deleteRow } from "../lib/supabaseRest";

const router = Router();

router.get("/projects", async (req, res) => {
  const status = String(req.query.status ?? "live");
  const filters: string[] = [];
  if (status !== "all") {
    filters.push(`status=eq.${encodeURIComponent(status)}`);
  }
  const query = filters.length ? `?${filters.join("&")}&order=created_at.desc` : "?order=created_at.desc";
  const data = await selectRows(`/projects${query}`);
  return res.json(data ?? []);
});

router.post("/projects", requireAuth, async (req, res) => {
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
    status: req.body?.status ?? "live"
  };

  const data = await insertRow("/projects", payload);
  return res.status(201).json(data?.[0] ?? payload);
});

router.patch("/projects/:id", requireAuth, async (req, res) => {
  const id = req.params.id;
  const data = await updateRow(`/projects?id=eq.${encodeURIComponent(id)}`, req.body ?? {});
  return res.json(data?.[0] ?? {});
});

router.delete("/projects/:id", requireAuth, async (req, res) => {
  const id = req.params.id;
  await deleteRow(`/projects?id=eq.${encodeURIComponent(id)}`);
  return res.status(204).end();
});

export default router;
