const TOKEN_KEY = "admin_token";
const PROD_API_FALLBACK = "https://drawndimension-node-api.onrender.com";

const normalizeApiBase = (value?: string | null) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  const unquoted = raw.replace(/^['"]+|['"]+$/g, "");
  if (!unquoted) return "";

  if (unquoted.startsWith("http://") || unquoted.startsWith("https://")) {
    return unquoted.replace(/\/$/, "");
  }

  return `https://${unquoted.replace(/\/$/, "")}`;
};

export function setAdminToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getAdminToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearAdminToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAdminAuthed() {
  return Boolean(getAdminToken());
}

export function getAdminBaseUrl() {
  return `${window.location.origin}/database`;
}

// Environment-aware API base resolver
export function getApiBaseUrl() {
  const envBaseRaw = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
  const envBase = normalizeApiBase(envBaseRaw);
  if (envBase) {
    return envBase;
  }

  const { protocol, hostname } = window.location;
  const isProductionDomain =
    hostname === "drawndimension.com" ||
    hostname === "www.drawndimension.com" ||
    hostname.endsWith(".drawndimension.com");

  if (isProductionDomain) {
    return PROD_API_FALLBACK;
  }

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `${protocol}//${hostname}:4000`;
  }

  return window.location.origin.replace(/\/$/, "");
}
