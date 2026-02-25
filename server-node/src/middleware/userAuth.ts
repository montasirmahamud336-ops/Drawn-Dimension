import { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";

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

export async function getSupabaseUserFromToken(accessToken: string): Promise<SupabaseUser | null> {
  const token = accessToken.trim();
  if (!token) return null;

  const response = await fetch(`${env.supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: env.supabaseServiceKey,
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as SupabaseUser;
  if (!data?.id) return null;
  return data;
}

export async function requireUserAuth(req: UserAuthRequest, res: Response, next: NextFunction) {
  try {
    const token = parseBearerToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await getSupabaseUserFromToken(token);
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
