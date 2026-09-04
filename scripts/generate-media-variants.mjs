// Standalone script to batch-generate 360w, 640w, and 960w WebP variants for all existing media
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createRequire } from "node:module";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

let sharp;
try {
  const require = createRequire(path.join(ROOT_DIR, "server-node", "package.json"));
  sharp = require("sharp");
} catch {
  const require = createRequire(import.meta.url);
  sharp = require("sharp");
}

const VARIANT_DEFINITIONS = [
  { name: "thumb", width: 360, suffix: "360w", quality: 75 },
  { name: "medium", width: 640, suffix: "640w", quality: 78 },
  { name: "large", width: 960, suffix: "960w", quality: 80 },
];

const candidateRoots = [
  path.join(ROOT_DIR, "server-node", "media"),
  path.join(ROOT_DIR, "media"),
  "/opt/drawndimension/media",
];

async function findImages(dir) {
  const results = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...(await findImages(fullPath)));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        // Skip already-generated variants
        if (entry.name.includes("-360w.webp") || entry.name.includes("-640w.webp") || entry.name.includes("-960w.webp")) {
          continue;
        }
        if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
          results.push(fullPath);
        }
      }
    }
  } catch {
    // Directory might not exist in this environment
  }
  return results;
}

async function processImage(imagePath) {
  const dir = path.dirname(imagePath);
  const ext = path.extname(imagePath);
  const base = path.basename(imagePath, ext);

  console.log(`Processing: ${path.relative(ROOT_DIR, imagePath)}`);

  try {
    const buffer = await fs.readFile(imagePath);
    const meta = await sharp(buffer).metadata();
    console.log(`  Original: ${meta.width}x${meta.height} (${(buffer.length / 1024).toFixed(1)} KB)`);

    // Cap original if oversized
    if (meta.width && meta.height && (meta.width > 2000 || meta.height > 2000)) {
      const capped = await sharp(buffer)
        .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
        .toBuffer();
      await fs.writeFile(imagePath, capped);
      console.log(`  Capped original to max 2000px: ${(capped.length / 1024).toFixed(1)} KB`);
    }

    for (const def of VARIANT_DEFINITIONS) {
      const variantPath = path.join(dir, `${base}-${def.suffix}.webp`);
      try {
        await fs.access(variantPath);
        // Already exists
      } catch {
        const variantBuffer = await sharp(buffer)
          .resize({ width: def.width, withoutEnlargement: true })
          .webp({ quality: def.quality })
          .toBuffer();
        await fs.writeFile(variantPath, variantBuffer);
        console.log(`  + Created ${def.suffix}: ${(variantBuffer.length / 1024).toFixed(1)} KB`);
      }
    }
  } catch (err) {
    console.error(`  Failed to process ${imagePath}:`, err.message);
  }
}

async function main() {
  console.log("=== DrawnDimension Media Variant Batch Generator ===");
  let totalProcessed = 0;

  for (const root of candidateRoots) {
    console.log(`Scanning directory: ${root}`);
    const images = await findImages(root);
    console.log(`Found ${images.length} images to check.`);
    for (const img of images) {
      await processImage(img);
      totalProcessed++;
    }
  }

  console.log(`\nDone! Processed ${totalProcessed} images across all media roots.`);
}

main().catch(console.error);
