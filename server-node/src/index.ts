import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";
import { env } from "./config/env";
import authRoutes from "./routes/auth";
import projectRoutes from "./routes/projects";
import teamRoutes from "./routes/team";
import productRoutes from "./routes/products";
import storageRoutes from "./routes/storage";
import reviewRoutes from "./routes/reviews";

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
  app.use(cors({ origin: env.corsOrigin, credentials: false }));
}

app.use(rateLimit({ windowMs: 10 * 60 * 1000, max: 120 }));

app.use(authRoutes);
app.use(projectRoutes);
app.use(teamRoutes);
app.use(productRoutes);
app.use(storageRoutes);
app.use(reviewRoutes);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(env.port, () => {
  console.log(`Admin API running on port ${env.port}`);
});
