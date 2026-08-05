import { Router } from "express";
import multer from "multer";
import { requireUserAuth, UserAuthRequest } from "../middleware/userAuth.js";
import { normalizeObjectPath, storeUploadedFile } from "../lib/mediaStorage.js";
import { validateUploadedBuffer } from "../lib/uploadValidation.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
});

router.post("/me/profile/avatar-upload", requireUserAuth, upload.single("file"), async (req: UserAuthRequest, res) => {
  try {
    const user = req.user;
    if (!user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "file is required" });
    }

    const validation = validateUploadedBuffer(file.buffer, file.originalname, file.mimetype, "image-only");
    if (!validation.valid) {
      return res.status(400).json({ message: validation.reason || "Please upload a valid image file" });
    }

    const ext = (file.originalname.split(".").pop() || "jpg").replace(/[^a-zA-Z0-9]/g, "") || "jpg";
    const objectPath = normalizeObjectPath(`profiles/${user.id}/avatar-${Date.now()}.${ext}`, ext);
    const saved = await storeUploadedFile({
      objectPath,
      buffer: new Uint8Array(file.buffer),
    });

    return res.status(201).json({
      path: saved.path,
      publicUrl: saved.publicUrl,
      fileName: file.originalname,
      mimeType: file.mimetype || "application/octet-stream",
      size: file.size,
    });
  } catch (error: unknown) {
    console.error("Avatar upload error:", error);
    return res.status(500).json({ message: "Failed to upload avatar" });
  }
});

export default router;
