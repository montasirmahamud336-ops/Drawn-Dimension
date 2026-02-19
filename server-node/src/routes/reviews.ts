import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { insertRow, selectRows, updateRow, deleteRow } from "../lib/supabaseRest";

const router = Router();

const normalizeRating = (value: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 5;
  const rounded = Math.round(numeric);
  return Math.max(1, Math.min(5, rounded));
};

const mapTestimonialToReview = (row: any) => {
  const isPublished =
    typeof row?.is_published === "boolean"
      ? row.is_published
      : String(row?.status ?? "").toLowerCase() !== "draft";

  return {
    id: row?.id,
    name: row?.name ?? "Anonymous Client",
    role: row?.role ?? "Verified Client",
    company: row?.company ?? null,
    content: row?.content ?? row?.review ?? "",
    rating: normalizeRating(row?.rating ?? row?.stars),
    image_url: row?.image_url ?? row?.avatar_url ?? null,
    project: row?.service_tag ?? row?.project ?? null,
    status: isPublished ? "live" : "draft",
    created_at: row?.created_at ?? null,
    _source: "testimonials"
  };
};

router.get("/reviews", async (req, res) => {
  try {
    const status = String(req.query.status ?? "live").toLowerCase();
    const filters: string[] = [];

    if (status === "live") filters.push("is_published=eq.true");
    if (status === "draft") filters.push("is_published=eq.false");

    const query = filters.length ? `?${filters.join("&")}&order=created_at.desc` : "?order=created_at.desc";
    const data = await selectRows(`/testimonials${query}`);
    return res.json((data ?? []).map(mapTestimonialToReview));
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || "Failed to fetch reviews" });
  }
});

router.post("/reviews", async (req, res) => {
  try {
    const isPublished = String(req.body?.status ?? "live").toLowerCase() === "live";
    const payload = {
      name: req.body?.name ?? "Anonymous Client",
      role: req.body?.role ?? null,
      content: req.body?.content ?? "",
      rating: normalizeRating(req.body?.rating),
      image_url: req.body?.image_url ?? null,
      service_tag: req.body?.project ?? null,
      is_published: isPublished
    };

    const data = await insertRow("/testimonials", payload);
    return res.status(201).json(mapTestimonialToReview(data?.[0] ?? payload));
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || "Failed to create review" });
  }
});

router.patch("/reviews/:id", requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const patch: Record<string, unknown> = {};

    if ("name" in req.body) patch.name = req.body.name;
    if ("role" in req.body) patch.role = req.body.role;
    if ("content" in req.body) patch.content = req.body.content;
    if ("rating" in req.body) patch.rating = normalizeRating(req.body.rating);
    if ("image_url" in req.body) patch.image_url = req.body.image_url ?? null;
    if ("project" in req.body) patch.service_tag = req.body.project ?? null;
    if ("status" in req.body) patch.is_published = String(req.body.status).toLowerCase() === "live";

    const data = await updateRow(`/testimonials?id=eq.${encodeURIComponent(id)}`, patch);
    if (!data || data.length === 0) {
      return res.status(404).json({ message: "Review not found" });
    }
    return res.json(mapTestimonialToReview(data[0]));
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || "Failed to update review" });
  }
});

router.delete("/reviews/:id", requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    await deleteRow(`/testimonials?id=eq.${encodeURIComponent(id)}`);
    return res.status(204).end();
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || "Failed to delete review" });
  }
});

export default router;

