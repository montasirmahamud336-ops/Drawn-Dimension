import { env } from "../config/env.js";

const baseUrl = `${env.supabaseUrl}/rest/v1`;
const baseHeaders = {
  apikey: env.supabaseServiceKey,
  Authorization: `Bearer ${env.supabaseServiceKey}`,
  "Content-Type": "application/json"
};

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...baseHeaders,
      ...(options.headers ?? {})
    }
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Supabase error ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function selectRows(path: string) {
  return request(path, { method: "GET" });
}

export async function insertRow(path: string, payload: unknown) {
  return request(path, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(payload)
  });
}

export async function updateRow(path: string, payload: unknown) {
  return request(path, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(payload)
  });
}

export async function deleteRow(path: string) {
  return request(path, { method: "DELETE" });
}
