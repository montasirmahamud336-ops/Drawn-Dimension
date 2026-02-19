import { Router } from "express";
import { env } from "../config/env";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post("/storage/ensure", requireAuth, async (_req, res) => {
  const bucket = env.storageBucket;
  const authHeaders = {
    apikey: env.supabaseServiceKey,
    Authorization: `Bearer ${env.supabaseServiceKey}`
  };

  const checkRes = await fetch(
    `${env.supabaseUrl}/storage/v1/bucket/${encodeURIComponent(bucket)}`,
    { headers: authHeaders }
  );

  if (checkRes.ok) {
    return res.json({ status: "ok", bucket });
  }

  if (checkRes.status !== 404) {
    const text = await checkRes.text().catch(() => "");
    return res.status(checkRes.status).json({ message: text || "Failed to check bucket" });
  }

  const createRes = await fetch(`${env.supabaseUrl}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      ...authHeaders,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      id: bucket,
      name: bucket,
      public: true
    })
  });

  if (!createRes.ok) {
    const text = await createRes.text().catch(() => "");
    if (!text.toLowerCase().includes("already")) {
      return res.status(createRes.status).json({ message: text || "Failed to create bucket" });
    }
  }

  return res.json({ status: "ok", bucket });
});

export default router;
