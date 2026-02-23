import { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";

export interface AuthRequest extends Request {
  admin?: { username: string };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization ?? "";
  const [scheme, token] = auth.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (token !== env.adminToken) {
    return res.status(401).json({ message: "Invalid token" });
  }

  req.admin = { username: env.adminUsername };
  return next();
}
