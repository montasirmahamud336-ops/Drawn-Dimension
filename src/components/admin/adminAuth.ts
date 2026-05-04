const TOKEN_KEY = "admin_token";
const PROFILE_KEY = "admin_profile";
const PROD_API_FALLBACK = "https://api.drawndimension.com";
const PROD_CHAT_API_FALLBACK = "https://chat.drawndimension.com";
const isLocalHostname = (host: string) => host === "localhost" || host === "127.0.0.1" || host === "::1";
const LOCAL_API_HOST = "127.0.0.1";

export type AdminProfile = {
  id?: string;
  username: string;
  email: string;
  fullName: string;
  role: "owner" | "manager";
  isMain: boolean;
};

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

const buildLocalLoopbackUrl = (protocol: string, port: string) => `${protocol}//${LOCAL_API_HOST}:${port}`;

const normalizeStoredToken = (value?: string | null) => {
  let raw = String(value ?? "").trim();
  if (!raw) return "";

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
    } catch {
      // ignore malformed JSON-looking value
    }
  }

  raw = raw.replace(/^['"]+|['"]+$/g, "").trim();
  while (/^bearer\s+/i.test(raw)) {
    raw = raw.replace(/^bearer\s+/i, "").trim();
  }

  return raw;
};

export function setAdminToken(token: string, profile?: AdminProfile | null) {
  setAdminSession(token, profile);
}

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  try {
    const segments = token.split(".");
    if (segments.length !== 3) return null;

    const base64 = segments[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const normalizeRole = (value: unknown): "owner" | "manager" =>
  String(value ?? "").toLowerCase() === "owner" ? "owner" : "manager";

const normalizeAdminProfile = (value: unknown): AdminProfile | null => {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const username = String(input.username ?? "").trim();
  if (!username) return null;

  const role = normalizeRole(input.role);
  return {
    id: String(input.id ?? "").trim() || undefined,
    username,
    email: String(input.email ?? "").trim(),
    fullName: String(input.fullName ?? input.full_name ?? username).trim() || username,
    role,
    isMain: Boolean(input.isMain) || role === "owner",
  };
};

export function setAdminSession(token: string, profile?: AdminProfile | null) {
  const normalizedToken = normalizeStoredToken(token);
  if (!normalizedToken) {
    clearAdminToken();
    return;
  }

  localStorage.setItem(TOKEN_KEY, normalizedToken);
  if (profile) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    return;
  }

  const payload = decodeJwtPayload(normalizedToken);
  const derivedProfile = normalizeAdminProfile({
    id: payload?.sub,
    username: payload?.username,
    email: payload?.email,
    fullName: payload?.fullName,
    role: payload?.role,
    isMain: payload?.isMain,
  });
  if (derivedProfile) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(derivedProfile));
  } else {
    localStorage.removeItem(PROFILE_KEY);
  }
}

export function getAdminProfile(): AdminProfile | null {
  const raw = localStorage.getItem(PROFILE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const normalized = normalizeAdminProfile(parsed);
      if (normalized) return normalized;
    } catch {
      // ignore and fallback to token decode
    }
  }

  const token = getAdminToken();
  if (!token) return null;

  const payload = decodeJwtPayload(token);
  const normalized = normalizeAdminProfile({
    id: payload?.sub,
    username: payload?.username,
    email: payload?.email,
    fullName: payload?.fullName,
    role: payload?.role,
    isMain: payload?.isMain,
  });
  if (normalized) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(normalized));
  }
  return normalized;
}

export function isMainAdmin() {
  return Boolean(getAdminProfile()?.isMain);
}

export async function refreshAdminProfileFromApi(): Promise<AdminProfile | null> {
  const token = getAdminToken();
  if (!token) return null;

  try {
    const response = await fetch(`${getApiBaseUrl()}/auth/admin-me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      clearAdminToken();
      return null;
    }

    if (!response.ok) {
      return getAdminProfile();
    }

    const payload = await response.json();
    const profile = normalizeAdminProfile(payload);
    if (!profile) {
      return getAdminProfile();
    }

    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    return profile;
  } catch {
    return getAdminProfile();
  }
}

export function getAdminToken() {
  const raw = localStorage.getItem(TOKEN_KEY);
  const normalized = normalizeStoredToken(raw);
  if (!normalized) {
    if (raw) {
      localStorage.removeItem(TOKEN_KEY);
    }
    return null;
  }

  if (raw !== normalized) {
    localStorage.setItem(TOKEN_KEY, normalized);
  }

  return normalized;
}

export function clearAdminToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PROFILE_KEY);
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

      if (runningOnLocal && envIsLocal) {
        return buildLocalLoopbackUrl(protocol, parsedEnv.port || "4000");
      }

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
    return buildLocalLoopbackUrl(protocol, "4000");
  }

  return window.location.origin.replace(/\/$/, "");
}

export function getChatApiBaseUrl() {
  const { protocol, hostname } = window.location;
  const runningOnLocal = isLocalHostname(hostname);
  const isProductionDomain =
    hostname === "drawndimension.com" ||
    hostname === "www.drawndimension.com" ||
    hostname.endsWith(".drawndimension.com");

  const envBaseRaw = (import.meta as any).env?.VITE_CHAT_API_BASE_URL as string | undefined;
  const envBase = normalizeApiBase(envBaseRaw);
  if (envBase) {
    const parsedEnv = parseUrl(envBase);
    if (parsedEnv) {
      const envHost = parsedEnv.hostname.toLowerCase();
      const envIsLocal = isLocalHostname(envHost);

      if (runningOnLocal && envIsLocal) {
        return buildLocalLoopbackUrl(protocol, parsedEnv.port || "8000");
      }

      if (!runningOnLocal && envIsLocal) {
        return isProductionDomain ? PROD_CHAT_API_FALLBACK : window.location.origin.replace(/\/$/, "");
      }

      if (protocol === "https:" && parsedEnv.protocol === "http:" && !envIsLocal) {
        return envBase.replace(/^http:\/\//i, "https://");
      }
    }

    return envBase;
  }

  if (isProductionDomain) {
    return PROD_CHAT_API_FALLBACK;
  }

  if (runningOnLocal) {
    return buildLocalLoopbackUrl(protocol, "8000");
  }

  return window.location.origin.replace(/\/$/, "");
}
