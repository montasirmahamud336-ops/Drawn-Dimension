import "dotenv/config";

const defaultCorsOrigins = "http://localhost:8080,http://127.0.0.1:8080";

const required = [
  "ADMIN_USERNAME",
  "ADMIN_PASSWORD",
  "ADMIN_TOKEN",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_KEY"
] as const;

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  adminUsername: process.env.ADMIN_USERNAME!,
  adminPassword: process.env.ADMIN_PASSWORD!,
  adminToken: process.env.ADMIN_TOKEN!,
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY!,
  storageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? "cms-uploads",
  corsOrigin: (process.env.CORS_ORIGIN ?? defaultCorsOrigins)
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
};
