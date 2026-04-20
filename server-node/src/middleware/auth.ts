import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export interface AuthRequest extends Request {
  admin?: {
    id: string;
    username: string;
    email: string;
    fullName: string;
    role: "owner" | "manager";
    isMain: boolean;
  };
}

type AdminTokenPayload = {
  sub?: string;
  username?: string;
  email?: string;
  fullName?: string;
  role?: "owner" | "manager";
  isMain?: boolean;
};

const normalizeRole = (value: unknown): "owner" | "manager" =>
  String(value ?? "").toLowerCase() === "owner" ? "owner" : "manager";

const extractTokenFromHeader = (value: string | undefined) => {
  let raw = String(value ?? "").trim();
  if (!raw) return "";

  if (/^bearer\s+/i.test(raw)) {
    raw = raw.replace(/^bearer\s+/i, "").trim();
  }

  raw = raw.replace(/^['"]+|['"]+$/g, "").trim();
  while (/^bearer\s+/i.test(raw)) {
    raw = raw.replace(/^bearer\s+/i, "").trim();
  }

  if (raw.startsWith("{") && raw.endsWith("}")) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const nested =
        typeof parsed.token === "string"
          ? parsed.token
          : typeof parsed.access_token === "string"
            ? parsed.access_token
            : typeof parsed.accessToken === "string"
              ? parsed.accessToken
              : "";
      raw = String(nested).trim() || raw;
      raw = raw.replace(/^['"]+|['"]+$/g, "").trim();
      while (/^bearer\s+/i.test(raw)) {
        raw = raw.replace(/^bearer\s+/i, "").trim();
      }
    } catch {
      // ignore malformed JSON-looking header values
    }
  }

  return raw;
};

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = extractTokenFromHeader(req.headers.authorization);

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (token === env.adminToken) {
    req.admin = {
      id: "legacy-owner",
      username: env.adminUsername,
      email: "",
      fullName: env.adminUsername,
      role: "owner",
      isMain: true
    };
    return next();
  }

  try {
    const payload = jwt.verify(token, env.adminToken) as AdminTokenPayload;
    const username = String(payload?.username ?? "").trim();

    if (!username) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    const role = normalizeRole(payload?.role);
    req.admin = {
      id: String(payload?.sub ?? "").trim() || "admin-user",
      username,
      email: String(payload?.email ?? "").trim(),
      fullName: String(payload?.fullName ?? username).trim(),
      role,
      isMain: Boolean(payload?.isMain) || role === "owner"
    };

    return next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}
