import fs from "fs/promises";
import path from "path";
import { env } from "../config/env.js";

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
  const absolutePath = joinStoragePath(bucket, params.objectPath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, params.buffer);

  return {
    path: params.objectPath,
    absolutePath,
    publicUrl: buildPublicMediaUrl(params.objectPath, bucket),
  };
};
