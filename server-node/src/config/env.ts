import "dotenv/config";
import path from "path";
import { SERVER_MEDIA_DIR } from "../lib/runtimePaths.js";

const defaultCorsOrigins =
  "http://localhost:8080,http://127.0.0.1:8080,http://localhost:8081,http://127.0.0.1:8081";
const hasDatabaseUrl = Boolean((process.env.DATABASE_URL ?? "").trim());

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");
const defaultSiteBaseUrl =
  process.env.SITE_BASE_URL ??
  (process.env.NODE_ENV === "production" ? "https://drawndimension.com" : "http://localhost:8080");
const defaultMediaBaseUrl =
  process.env.NODE_ENV === "production"
    ? `${trimTrailingSlash(defaultSiteBaseUrl)}/media`
    : `http://localhost:${process.env.PORT ?? 4000}/media`;

const required = [
  "ADMIN_USERNAME",
  "ADMIN_PASSWORD",
  "ADMIN_TOKEN",
] as const;

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}

if (!hasDatabaseUrl) {
  for (const key of ["SUPABASE_URL", "SUPABASE_SERVICE_KEY"] as const) {
    if (!process.env[key]) {
      throw new Error(`Missing required env var: ${key}`);
    }
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  adminUsername: process.env.ADMIN_USERNAME!,
  adminPassword: process.env.ADMIN_PASSWORD!,
  adminToken: process.env.ADMIN_TOKEN!,
  userAuthToken: process.env.USER_AUTH_TOKEN ?? process.env.ADMIN_TOKEN!,
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY ?? "",
  storageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? "cms-uploads",
  databaseUrl: process.env.DATABASE_URL ?? "",
  databaseSsl: (process.env.DATABASE_SSL ?? "false").toLowerCase() === "true",
  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpSecure: (process.env.SMTP_SECURE ?? "false").toLowerCase() === "true",
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPass: process.env.SMTP_PASS ?? "",
  smtpFrom: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "",
  officialNotificationEmail: process.env.OFFICIAL_NOTIFICATION_EMAIL ?? process.env.SMTP_USER ?? "",
  contactFormNotificationEmail:
    process.env.CONTACT_FORM_NOTIFICATION_EMAIL ??
    process.env.OFFICIAL_NOTIFICATION_EMAIL ??
    process.env.SMTP_USER ??
    "",
  liveChatNotificationEmail:
    process.env.LIVE_CHAT_NOTIFICATION_EMAIL ??
    process.env.OFFICIAL_NOTIFICATION_EMAIL ??
    process.env.SMTP_USER ??
    "",
  siteBaseUrl: defaultSiteBaseUrl,
  mediaBaseUrl: trimTrailingSlash(process.env.MEDIA_BASE_URL ?? defaultMediaBaseUrl),
  mediaRoot:
    process.env.MEDIA_ROOT ??
    (process.env.NODE_ENV === "production" ? "/opt/drawndimension/media" : SERVER_MEDIA_DIR),
  brandLogoUrl: process.env.BRAND_LOGO_URL ?? "",
  corsOrigin: (process.env.CORS_ORIGIN ?? defaultCorsOrigins)
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
};
