import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";
import { env } from "./config/env.js";
import { SERVER_UPLOADS_DIR } from "./lib/runtimePaths.js";
import { isSecurityTestMode } from "./lib/securityTestMode.js";
import authRoutes from "./routes/auth.js";
import projectRoutes from "./routes/projects.js";
import teamRoutes from "./routes/team.js";
import productRoutes from "./routes/products.js";
import storageRoutes from "./routes/storage.js";
import userProfileRoutes from "./routes/userProfile.js";
import userAccountRoutes from "./routes/userAccount.js";
import reviewRoutes from "./routes/reviews.js";
import employeesRoutes from "./routes/employees.js";
import workAssignmentsRoutes from "./routes/workAssignments.js";
import employeeInvoicesRoutes from "./routes/employeeInvoices.js";
import employeeDashboardRoutes from "./routes/employeeDashboard.js";
import chatRoutes from "./routes/chat.js";
import collaborationRoutes from "./routes/collaboration.js";
import worldMapSettingsRoutes from "./routes/worldMapSettings.js";
import servicesRoutes from "./routes/services.js";
import serviceFaqsRoutes from "./routes/serviceFaqs.js";
import serviceBlogsRoutes from "./routes/serviceBlogs.js";
import formMessagesRoutes from "./routes/formMessages.js";
import liveChatRequestsRoutes from "./routes/liveChatRequests.js";
import headerFooterSettingsRoutes from "./routes/headerFooterSettings.js";
import homePageSettingsRoutes from "./routes/homePageSettings.js";
import inquiriesRoutes from "./routes/inquiries.js";
import advanceRequestsRoutes from "./routes/advanceRequests.js";
import websiteUsersRoutes from "./routes/websiteUsers.js";
import systemVersionsRoutes from "./routes/systemVersions.js";
import databaseBackupRoutes from "./routes/databaseBackup.js";
import paymentsRoutes from "./routes/payments.js";

import { responseCompression } from "./middleware/compression.js";
import { generateVariantOnDemand } from "./lib/mediaStorage.js";

export const app = express();

const isLoopbackHost = (host: string) =>
  host === "localhost" || host === "127.0.0.1" || host === "::1";

const normalizeHost = (host: string) => host.trim().toLowerCase().replace(/\.+$/, "");

const uploadsPath = SERVER_UPLOADS_DIR;
if (!isSecurityTestMode() && !fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
if (!isSecurityTestMode() && !fs.existsSync(env.mediaRoot)) {
  fs.mkdirSync(env.mediaRoot, { recursive: true });
}

// The admin API sits behind a single reverse proxy hop in production.
app.set("trust proxy", env.nodeEnv === "production" ? 1 : false);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(responseCompression);

if (!isSecurityTestMode()) {
  const staticCacheOptions = {
    maxAge: "30d",
    immutable: true,
  };

  const REMOTE_MEDIA_ORIGIN = "https://www.drawndimension.com";

  // On-demand thumbnail/variant generation for WebP sizes if not already on disk
  app.get(/^\/media\/(.+)-(360w|640w|960w)\.webp$/, async (req, res, next) => {
    try {
      const match = req.path.match(/^\/media\/([^/]+)\/(.+-(?:360w|640w|960w)\.webp)$/);
      const bucket = match ? match[1] : env.storageBucket;
      const objectPath = match ? match[2] : req.path.replace(/^\/media\//, "");

      const diskPath = path.join(env.mediaRoot, bucket, ...objectPath.split("/"));
      if (fs.existsSync(diskPath)) {
        return next();
      }

      let generated = await generateVariantOnDemand(bucket, objectPath);

      // In local development or if base image is not on local disk, fetch original from production and generate
      if (!generated && (process.platform === "win32" || env.nodeEnv !== "production")) {
        const variantMatch = objectPath.match(/^(.+)-(360w|640w|960w)\.webp$/i);
        if (variantMatch) {
          const basePathWithoutSuffix = variantMatch[1];
          const possibleExts = [".webp", ".jpg", ".png", ".jpeg", ".JPG", ".PNG", ".JPEG", ".WEBP"];
          for (const ext of possibleExts) {
            try {
              const remoteUrl = `${REMOTE_MEDIA_ORIGIN}/media/${bucket}/${basePathWithoutSuffix}${ext}`;
              const remoteResp = await fetch(remoteUrl);
              if (remoteResp.ok) {
                const remoteBuf = Buffer.from(await remoteResp.arrayBuffer());
                const localBaseFile = path.join(env.mediaRoot, bucket, ...`${basePathWithoutSuffix}${ext}`.split("/"));
                await fs.promises.mkdir(path.dirname(localBaseFile), { recursive: true });
                await fs.promises.writeFile(localBaseFile, remoteBuf);

                generated = await generateVariantOnDemand(bucket, objectPath);
                if (generated) break;
              }
            } catch {
              // continue checking
            }
          }
        }
      }

      if (generated) {
        res.setHeader("Content-Type", generated.contentType);
        res.setHeader("Cache-Control", "public, max-age=2592000, immutable");
        return res.send(generated.buffer);
      }
    } catch (err) {
      console.error("On-demand variant generation error:", err);
    }
    next();
  });

  // Local development fallback: if an original image is not in local mediaRoot, fetch & cache from production
  if (process.platform === "win32" || env.nodeEnv !== "production") {
    app.get(/^\/media\/(.+)$/, async (req, res, next) => {
      try {
        const subPath = req.path.replace(/^\/media\//, "");
        const localPath = path.join(env.mediaRoot, ...subPath.split("/"));
        if (fs.existsSync(localPath)) {
          return next();
        }

        const remoteUrl = `${REMOTE_MEDIA_ORIGIN}/media/${subPath}`;
        const remoteResp = await fetch(remoteUrl);
        if (remoteResp.ok) {
          const remoteBuf = Buffer.from(await remoteResp.arrayBuffer());
          await fs.promises.mkdir(path.dirname(localPath), { recursive: true });
          await fs.promises.writeFile(localPath, remoteBuf);

          const contentType = remoteResp.headers.get("content-type") || "application/octet-stream";
          res.setHeader("Content-Type", contentType);
          res.setHeader("Cache-Control", "public, max-age=2592000, immutable");
          return res.send(remoteBuf);
        }
      } catch (err) {
        console.debug("Local media proxy fallback skipped:", err);
      }
      next();
    });
  }

  app.use("/uploads", express.static(uploadsPath, staticCacheOptions));
  app.use("/media", express.static(env.mediaRoot, staticCacheOptions));
}

// Some routes handle errors locally. Ensure a raw internal message can never
// escape through any 5xx JSON response in production.
app.use((_req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    if (env.nodeEnv === "production" && res.statusCode >= 500) {
      return originalJson({ message: "Internal server error" });
    }
    return originalJson(body);
  }) as typeof res.json;
  next();
});

// Strict CORS: Allow exact origins explicitly listed in CORS_ORIGIN only in production
if (env.corsOrigin.length > 0) {
  const normalizedOrigins = env.corsOrigin
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);

  const allowedOrigins = new Set(normalizedOrigins);

  app.use(
    cors({
      credentials: false,
      origin: (origin, callback) => {
        if (!origin) {
          callback(null, true);
          return;
        }

        const normalized = origin.trim().replace(/\/+$/, "");
        if (allowedOrigins.has(normalized)) {
          callback(null, true);
          return;
        }

        try {
          const parsedUrl = new URL(normalized);
          const hostname = normalizeHost(parsedUrl.hostname);

          // In local/dev mode allow loopback origin regardless of port
          if (env.nodeEnv !== "production" && isLoopbackHost(hostname)) {
            callback(null, true);
            return;
          }
        } catch {
          // ignore parse errors and reject below
        }

        callback(new Error(`Origin not allowed by CORS: ${origin}`));
      },
    })
  );
}

// Specific Route Rate Limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { message: "Too many authentication attempts, please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const publicSubmissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many submissions, please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: "Too many upload requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply targeted rate limiters to exact sensitive paths
app.use("/auth/login", authLimiter);
app.use("/auth/user-login", authLimiter);
app.use("/auth/user-signup", authLimiter);
app.use("/auth/user-google", authLimiter);
app.use("/auth/user-password-request", authLimiter);
app.use("/auth/user-password-reset", authLimiter);

app.post("/inquiries", publicSubmissionLimiter);
app.post("/api/inquiries", publicSubmissionLimiter);
app.post("/form-messages", publicSubmissionLimiter);
app.post("/api/form-messages", publicSubmissionLimiter);
app.post("/live-chat/requests", publicSubmissionLimiter);
app.post("/api/live-chat/requests", publicSubmissionLimiter);

app.post("/storage/upload", uploadLimiter);

// Global fallback rate limit for general traffic
app.use(rateLimit({ windowMs: 10 * 60 * 1000, max: 300 }));

// Mount Application Routes
app.use(authRoutes);
app.use(projectRoutes);
app.use(teamRoutes);
app.use(productRoutes);
app.use(storageRoutes);
app.use(userProfileRoutes);
app.use(userAccountRoutes);
app.use(reviewRoutes);
app.use(servicesRoutes);
app.use(serviceFaqsRoutes);
app.use(serviceBlogsRoutes);
app.use(employeesRoutes);
app.use(workAssignmentsRoutes);
app.use(employeeInvoicesRoutes);
app.use(employeeDashboardRoutes);
app.use(chatRoutes);
app.use(collaborationRoutes);
app.use(worldMapSettingsRoutes);
app.use(formMessagesRoutes);
app.use(liveChatRequestsRoutes);
app.use(headerFooterSettingsRoutes);
app.use(homePageSettingsRoutes);
app.use(inquiriesRoutes);
app.use(advanceRequestsRoutes);
app.use(websiteUsersRoutes);
app.use(systemVersionsRoutes);
app.use(databaseBackupRoutes);
app.use(paymentsRoutes);

app.get("/health", (_req, res) => res.json({ ok: true }));

// Centralized production error handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled API Error:", err);
  if (res.headersSent) return;

  const isProd = env.nodeEnv === "production";
  return res.status(500).json({
    message: isProd
      ? "An internal server error occurred"
      : err instanceof Error
        ? err.message
        : "Internal Server Error",
  });
});
