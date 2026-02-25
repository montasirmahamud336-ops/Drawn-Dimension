const TOKEN_KEY = "admin_token";
const PROD_API_FALLBACK = "https://drawndimension-node-api.onrender.com";
const isLocalHostname = (host: string) => host === "localhost" || host === "127.0.0.1" || host === "::1";

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

const parseUrl = (value: string) => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
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
  const { protocol, hostname } = window.location;
  const runningOnLocal = isLocalHostname(hostname);
  const isProductionDomain =
    hostname === "drawndimension.com" ||
    hostname === "www.drawndimension.com" ||
    hostname.endsWith(".drawndimension.com");

  const envBaseRaw = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
  const envBase = normalizeApiBase(envBaseRaw);
  if (envBase) {
    const parsedEnv = parseUrl(envBase);
    if (parsedEnv) {
      const envHost = parsedEnv.hostname.toLowerCase();
      const envIsLocal = isLocalHostname(envHost);

      if (!runningOnLocal && envIsLocal) {
        return isProductionDomain ? PROD_API_FALLBACK : window.location.origin.replace(/\/$/, "");
      }

      if (protocol === "https:" && parsedEnv.protocol === "http:" && !envIsLocal) {
        return envBase.replace(/^http:\/\//i, "https://");
      }
    }

    return envBase;
  }

  if (isProductionDomain) {
    return PROD_API_FALLBACK;
  }

  if (runningOnLocal) {
    return `${protocol}//${hostname}:4000`;
  }

  return window.location.origin.replace(/\/$/, "");
}
