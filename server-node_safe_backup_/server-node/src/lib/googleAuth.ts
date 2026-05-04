import { env } from "../config/env.js";

export type GoogleIdentity = {
  sub: string;
  email: string;
  name: string;
  picture: string | null;
};

type GoogleTokenInfoResponse = {
  sub?: string;
  email?: string;
  name?: string;
  picture?: string;
  aud?: string;
  iss?: string;
  email_verified?: string | boolean;
};

const GOOGLE_TOKENINFO_ENDPOINT = "https://oauth2.googleapis.com/tokeninfo";

export const isGoogleAuthConfigured = () => Boolean(env.googleClientId.trim());

export const verifyGoogleIdToken = async (idToken: string): Promise<GoogleIdentity | null> => {
  const token = String(idToken ?? "").trim();
  if (!token || !isGoogleAuthConfigured()) {
    return null;
  }

  const response = await fetch(
    `${GOOGLE_TOKENINFO_ENDPOINT}?id_token=${encodeURIComponent(token)}`
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as GoogleTokenInfoResponse;
  const issuer = String(data.iss ?? "").trim().toLowerCase();
  const audience = String(data.aud ?? "").trim();
  const subject = String(data.sub ?? "").trim();
  const email = String(data.email ?? "").trim().toLowerCase();
  const emailVerified = String(data.email_verified ?? "").toLowerCase() === "true";

  if (!subject || !email || !emailVerified) {
    return null;
  }

  if (audience !== env.googleClientId.trim()) {
    return null;
  }

  if (issuer !== "accounts.google.com" && issuer !== "https://accounts.google.com") {
    return null;
  }

  return {
    sub: subject,
    email,
    name: String(data.name ?? "").trim() || email,
    picture: String(data.picture ?? "").trim() || null,
  };
};
