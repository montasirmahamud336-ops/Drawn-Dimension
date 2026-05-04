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

    return res.status(201).json({ path: objectPath, publicUrl: saved.publicUrl });
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to upload file"
    });
  }
});

export default router;
