import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { env } from "../config/env.js";

export const VARIANT_DEFINITIONS = [
  { name: "thumb", width: 360, suffix: "360w", quality: 75 },
  { name: "medium", width: 640, suffix: "640w", quality: 78 },
  { name: "large", width: 960, suffix: "960w", quality: 80 },
] as const;

export const isImageExtension = (ext: string) => {
  const clean = ext.toLowerCase().replace(/^\./, "");
  return ["jpg", "jpeg", "png", "webp", "avif", "gif"].includes(clean);
};

export const getVariantObjectPath = (objectPath: string, suffix: string, targetExt = "webp") => {
  const dir = path.dirname(objectPath);
  const ext = path.extname(objectPath);
  const base = path.basename(objectPath, ext);
  const filename = `${base}-${suffix}.${targetExt}`;
  return dir === "." ? filename : `${dir}/${filename}`.replace(/\\/g, "/");
};

export const normalizeObjectPath = (rawPath: unknown, fallbackExt: string) => {
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

const joinStoragePath = (bucket: string, objectPath: string) =>
  path.join(env.mediaRoot, bucket, ...objectPath.split("/"));

export const ensureMediaBucket = async (bucket = env.storageBucket) => {
  await fs.mkdir(path.join(env.mediaRoot, bucket), { recursive: true });
};

export const buildPublicMediaUrl = (objectPath: string, bucket = env.storageBucket) => {
  const encodedPath = objectPath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `${env.mediaBaseUrl}/${encodeURIComponent(bucket)}/${encodedPath}`;
};

export const storeUploadedFile = async (params: {
  buffer: Uint8Array;
  objectPath: string;
  bucket?: string;
}) => {
  const bucket = params.bucket ?? env.storageBucket;
  const ext = path.extname(params.objectPath).toLowerCase().replace(/^\./, "");
  const isImage = isImageExtension(ext);
  const absolutePath = joinStoragePath(bucket, params.objectPath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });

  let storedBuffer = Buffer.from(params.buffer);
  const variants: Record<string, { path: string; publicUrl: string; width: number }> = {};

  if (isImage) {
    try {
      const sharpInstance = sharp(storedBuffer);
      const metadata = await sharpInstance.metadata();

      // Cap stored original at max 2000px in either dimension to avoid storing 10,000px raw exports
      if (metadata.width && metadata.height && (metadata.width > 2000 || metadata.height > 2000)) {
        storedBuffer = await sharp(storedBuffer)
          .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
          .toBuffer();
      }

      // Generate 3 WebP variants: thumb (360w), medium (640w), large (960w)
      for (const def of VARIANT_DEFINITIONS) {
        const variantBuffer = await sharp(storedBuffer)
          .resize({ width: def.width, withoutEnlargement: true })
          .webp({ quality: def.quality })
          .toBuffer();

        const variantObjectPath = getVariantObjectPath(params.objectPath, def.suffix, "webp");
        const variantAbsolutePath = joinStoragePath(bucket, variantObjectPath);
        await fs.writeFile(variantAbsolutePath, variantBuffer);

        variants[def.name] = {
          path: variantObjectPath,
          publicUrl: buildPublicMediaUrl(variantObjectPath, bucket),
          width: def.width,
        };
      }
    } catch (err) {
      console.error("Failed to generate image variants:", err);
    }
  }

  await fs.writeFile(absolutePath, storedBuffer);

  return {
    path: params.objectPath,
    absolutePath,
    publicUrl: buildPublicMediaUrl(params.objectPath, bucket),
    variants: Object.keys(variants).length > 0 ? variants : undefined,
  };
};

export const generateVariantOnDemand = async (
  bucket: string,
  variantObjectPath: string
): Promise<{ buffer: Buffer; contentType: string } | null> => {
  const match = variantObjectPath.match(/^(.+)-(360w|640w|960w)\.webp$/i);
  if (!match) return null;

  const basePathWithoutSuffix = match[1];
  const suffix = match[2];
  const def = VARIANT_DEFINITIONS.find((d) => d.suffix === suffix);
  if (!def) return null;

  const possibleExts = [".jpg", ".jpeg", ".png", ".webp", ".avif", ".JPG", ".PNG", ".JPEG", ".WEBP"];
  let baseFilePath = "";

  for (const ext of possibleExts) {
    const candidatePath = joinStoragePath(bucket, `${basePathWithoutSuffix}${ext}`);
    try {
      await fs.access(candidatePath);
      baseFilePath = candidatePath;
      break;
    } catch {
      // continue checking next extension
    }
  }

  if (!baseFilePath) return null;

  try {
    const originalBuffer = await fs.readFile(baseFilePath);
    const variantBuffer = await sharp(originalBuffer)
      .resize({ width: def.width, withoutEnlargement: true })
      .webp({ quality: def.quality })
      .toBuffer();

    const targetVariantPath = joinStoragePath(bucket, variantObjectPath);
    await fs.mkdir(path.dirname(targetVariantPath), { recursive: true });
    await fs.writeFile(targetVariantPath, variantBuffer);

    return {
      buffer: variantBuffer,
      contentType: "image/webp",
    };
  } catch (err) {
    console.error(`On-demand variant generation failed for ${variantObjectPath}:`, err);
    return null;
  }
};

