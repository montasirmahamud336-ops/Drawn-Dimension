import { Request, Response, NextFunction } from "express";
import zlib from "node:zlib";

const COMPRESSIBLE_TYPES = [
  "application/json",
  "text/html",
  "text/plain",
  "text/css",
  "application/javascript",
  "image/svg+xml",
];

const MIN_COMPRESS_SIZE = 256;

export const responseCompression = (req: Request, res: Response, next: NextFunction) => {
  const acceptEncoding = req.headers["accept-encoding"] || "";
  if (!acceptEncoding.includes("gzip")) {
    return next();
  }

  const originalSend = res.send.bind(res);

  res.send = ((body: any) => {
    // Check if already encoded or if response is empty
    if (res.getHeader("Content-Encoding") || !body) {
      return originalSend(body);
    }

    const contentType = String(res.getHeader("Content-Type") || "");
    const isCompressible = COMPRESSIBLE_TYPES.some((type) => contentType.includes(type));

    if (!isCompressible) {
      return originalSend(body);
    }

    let buffer: Buffer;
    if (Buffer.isBuffer(body)) {
      buffer = body;
    } else if (typeof body === "string") {
      buffer = Buffer.from(body);
    } else if (typeof body === "object") {
      buffer = Buffer.from(JSON.stringify(body));
      if (!contentType.includes("json")) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
      }
    } else {
      return originalSend(body);
    }

    if (buffer.length < MIN_COMPRESS_SIZE) {
      return originalSend(body);
    }

    try {
      const gzipped = zlib.gzipSync(buffer, { level: 6 });
      res.setHeader("Content-Encoding", "gzip");
      res.setHeader("Vary", "Accept-Encoding");
      res.removeHeader("Content-Length");
      return originalSend(gzipped);
    } catch {
      return originalSend(body);
    }
  }) as typeof res.send;

  next();
};
