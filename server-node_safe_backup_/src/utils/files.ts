import fs from "fs/promises";
import path from "path";

export async function safeUnlink(baseDir: string, fileUrl: string) {
  // Prevent path traversal by resolving within baseDir
  const fileName = path.basename(fileUrl);
  const filePath = path.join(baseDir, fileName);
  try {
    await fs.unlink(filePath);
  } catch {
    // Ignore missing files
  }
}
