import { NextFunction, Request, Response } from "express";
import { getSiteUserFromToken } from "../lib/siteUserAuth.js";

export interface SupabaseUser {
  id: string;
  email: string | null;
  created_at?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
  identities?: Array<{ provider?: string }>;
}

export interface UserAuthRequest extends Request {
  user?: SupabaseUser;
}

const parseBearerToken = (authHeader: string | undefined) => {
  if (!authHeader) return "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) return "";
  return token;
};

export async function getUserFromAccessToken(accessToken: string): Promise<SupabaseUser | null> {
  const token = accessToken.trim();
  if (!token) return null;
  return getSiteUserFromToken(token);
}

export async function requireUserAuth(req: UserAuthRequest, res: Response, next: NextFunction) {
  try {
    const token = parseBearerToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await getUserFromAccessToken(token);
    if (!user) {
      return res.status(401).json({ message: "Invalid user token" });
    }

    req.user = user;
    return next();
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to authenticate user"
    });
  }
}
