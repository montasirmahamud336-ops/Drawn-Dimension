import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";
import { env } from "./config/env.js";
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
import employeeDashboardRoutes from "./routes/employeeDashboard.js";
import chatRoutes from "./routes/chat.js";
import worldMapSettingsRoutes from "./routes/worldMapSettings.js";
import servicesRoutes from "./routes/services.js";
import serviceFaqsRoutes from "./routes/serviceFaqs.js";
import serviceBlogsRoutes from "./routes/serviceBlogs.js";
import formMessagesRoutes from "./routes/formMessages.js";
import liveChatRequestsRoutes from "./routes/liveChatRequests.js";
import headerFooterSettingsRoutes from "./routes/headerFooterSettings.js";
import homePageSettingsRoutes from "./routes/homePageSettings.js";

const app = express();
const isLoopbackHost = (host: string) =>
  host === "localhost" || host === "127.0.0.1" || host === "::1";
const normalizeHost = (host: string) => host.trim().toLowerCase().replace(/\.+$/, "");
const parseHostname = (value: string) => {
  try {
    return normalizeHost(new URL(value).hostname);
  } catch {
    return "";
  }
};
const siteHostname = parseHostname(env.siteBaseUrl);
const siteApexHostname = siteHostname.replace(/^www\./, "");

const uploadsPath = path.resolve("uploads");
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
if (!fs.existsSync(env.mediaRoot)) {
  fs.mkdirSync(env.mediaRoot, { recursive: true });
}

// The admin API sits behind a single reverse proxy hop in production.
app.set("trust proxy", env.nodeEnv === "production" ? 1 : false);
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(uploadsPath));
app.use("/media", express.static(env.mediaRoot));

if (env.corsOrigin.length > 0) {
  const normalizedOrigins = env.corsOrigin
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);

  const allowedOrigins = new Set(normalizedOrigins);
  const allowedHosts = new Set(
    normalizedOrigins
      .map((origin) => {
        try {
          return new URL(origin).host.toLowerCase();
        } catch {
          return "";
        }
      })
      .filter(Boolean)
  );
  const allowedHostnames = new Set(
    normalizedOrigins
      .map((origin) => parseHostname(origin))
      .filter(Boolean)
  );
  const isTrustedSiteHost = (hostname: string) => {
    if (!siteApexHostname) return false;
    return (
      hostname === siteApexHostname ||
      hostname === siteHostname ||
      hostname.endsWith(`.${siteApexHostname}`)
    );
  };

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
          const host = parsedUrl.host.toLowerCase();
          const hostname = normalizeHost(parsedUrl.hostname);
          if (allowedHosts.has(host)) {
            callback(null, true);
            return;
          }

          if (allowedHostnames.has(hostname) || isTrustedSiteHost(hostname)) {
            callback(null, true);
            return;
          }

          // In local/dev mode allow any localhost/loopback origin regardless of port
          // to prevent CORS errors when Vite falls back to a different port (e.g. 8081).
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

app.use(rateLimit({ windowMs: 10 * 60 * 1000, max: 300 }));

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
app.use(employeeDashboardRoutes);
app.use(chatRoutes);
app.use(worldMapSettingsRoutes);
app.use(formMessagesRoutes);
app.use(liveChatRequestsRoutes);
app.use(headerFooterSettingsRoutes);
app.use(homePageSettingsRoutes);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(env.port, () => {
  console.log(`Admin API running on port ${env.port}`);
});
