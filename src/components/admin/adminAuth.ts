const TOKEN_KEY = "admin_token";

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
  const envBase = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
  if (envBase && envBase.trim().length > 0) {
    return envBase.replace(/\/$/, "");
  }

  const { protocol, hostname } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `${protocol}//${hostname}:4000`;
  }

  return window.location.origin.replace(/\/$/, "");
}
