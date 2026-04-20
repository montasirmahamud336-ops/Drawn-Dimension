import { Router } from "express";
import multer from "multer";
import { env } from "../config/env.js";
import { requireAuth } from "../middleware/auth.js";
import { ensureMediaBucket, normalizeObjectPath, storeUploadedFile } from "../lib/mediaStorage.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

const isLoopbackHost = (host: string) =>
  host === "localhost" || host === "127.0.0.1" || host === "::1";

const buildLocalMediaUrl = (host: string, objectPath: string, bucket = env.storageBucket) => {
  const encodedPath = objectPath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `http://${host}/media/${encodeURIComponent(bucket)}/${encodedPath}`;
};

router.post("/storage/ensure", requireAuth, async (_req, res) => {
  const bucket = env.storageBucket;
  try {
    await ensureMediaBucket(bucket);
    return res.json({ status: "ok", bucket });
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to prepare media storage"
    });
  }
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
    const saved = await storeUploadedFile({
      bucket,
      objectPath,
      buffer: new Uint8Array(file.buffer),
    });

    const requestHost = String(req.get("host") || "").trim();
    const hostname = requestHost.split(":")[0].toLowerCase();
    const publicUrl = isLoopbackHost(hostname)
      ? buildLocalMediaUrl(requestHost, objectPath, bucket)
      : saved.publicUrl;

    return res.status(201).json({ path: objectPath, publicUrl });
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to upload file"
    });
  }
});

export default router;
