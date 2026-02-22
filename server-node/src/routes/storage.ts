import { Router } from "express";
import multer from "multer";
import { env } from "../config/env";
import { requireAuth } from "../middleware/auth";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

const authHeaders = {
  apikey: env.supabaseServiceKey,
  Authorization: `Bearer ${env.supabaseServiceKey}`
};

const normalizeObjectPath = (rawPath: unknown, fallbackExt: string) => {
  const value = String(rawPath ?? "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");

  const safeParts = value
    .split("/")
    .filter((part) => part.length > 0 && part !== "." && part !== "..")
    .map((part) => part.replace(/[^a-zA-Z0-9._-]/g, "-"));

  if (safeParts.length === 0) {
    const randomName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fallbackExt}`;
    return `misc/${randomName}`;
  }

  return safeParts.join("/");
};

router.post("/storage/ensure", requireAuth, async (_req, res) => {
  const bucket = env.storageBucket;

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

router.post("/storage/upload", requireAuth, upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "file is required" });
    }

    const bucket = env.storageBucket;
    const ext = (file.originalname.split(".").pop() || "bin").replace(/[^a-zA-Z0-9]/g, "") || "bin";
    const objectPath = normalizeObjectPath(req.body?.path, ext);
    const encodedPath = objectPath.split("/").map((part) => encodeURIComponent(part)).join("/");

    const uploadRes = await fetch(
      `${env.supabaseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${encodedPath}`,
      {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": file.mimetype || "application/octet-stream",
          "x-upsert": "true"
        },
        body: new Uint8Array(file.buffer)
      }
    );

    if (!uploadRes.ok) {
      const text = await uploadRes.text().catch(() => "");
      return res.status(uploadRes.status).json({ message: text || "Failed to upload file" });
    }

    const publicUrl = `${env.supabaseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodedPath}`;
    return res.status(201).json({ path: objectPath, publicUrl });
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to upload file"
    });
  }
});

export default router;
