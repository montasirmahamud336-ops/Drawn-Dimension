import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { insertRow, selectRows, updateRow, deleteRow } from "../lib/supabaseRest";

const router = Router();

router.get("/products", async (req, res) => {
  const status = String(req.query.status ?? "live");
  const filters: string[] = [];
  if (status !== "all") {
    filters.push(`status=eq.${encodeURIComponent(status)}`);
  }
  const query = filters.length ? `?${filters.join("&")}&order=created_at.desc` : "?order=created_at.desc";
  const data = await selectRows(`/products${query}`);
  return res.json(data ?? []);
});

router.post("/products", requireAuth, async (req, res) => {
  const payload = {
    name: req.body?.name,
    description: req.body?.description ?? null,
    price: req.body?.price ?? null,
    image_url: req.body?.image_url ?? null,
    media: req.body?.media ?? [],
    category: req.body?.category ?? null,
    status: req.body?.status ?? "live"
  };
  const data = await insertRow("/products", payload);
  return res.status(201).json(data?.[0] ?? payload);
});

router.patch("/products/:id", requireAuth, async (req, res) => {
  const id = req.params.id;
  const data = await updateRow(`/products?id=eq.${encodeURIComponent(id)}`, req.body ?? {});
  return res.json(data?.[0] ?? {});
});

router.delete("/products/:id", requireAuth, async (req, res) => {
  const id = req.params.id;
  await deleteRow(`/products?id=eq.${encodeURIComponent(id)}`);
  return res.status(204).end();
});

export default router;
