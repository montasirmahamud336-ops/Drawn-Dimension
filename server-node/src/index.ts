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
import reviewRoutes from "./routes/reviews.js";
import employeesRoutes from "./routes/employees.js";
import workAssignmentsRoutes from "./routes/workAssignments.js";
import employeeDashboardRoutes from "./routes/employeeDashboard.js";
import chatRoutes from "./routes/chat.js";

const app = express();

const uploadsPath = path.resolve("uploads");
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(uploadsPath));

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
          const host = new URL(normalized).host.toLowerCase();
          if (allowedHosts.has(host)) {
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

app.use(rateLimit({ windowMs: 10 * 60 * 1000, max: 120 }));

app.use(authRoutes);
app.use(projectRoutes);
app.use(teamRoutes);
app.use(productRoutes);
app.use(storageRoutes);
app.use(reviewRoutes);
app.use(employeesRoutes);
app.use(workAssignmentsRoutes);
app.use(employeeDashboardRoutes);
app.use(chatRoutes);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(env.port, () => {
  console.log(`Admin API running on port ${env.port}`);
});
