import { getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";

export const CMS_BUCKET = (import.meta as any).env?.VITE_SUPABASE_BUCKET || "cms-uploads";

export async function ensureCmsBucket() {
  const apiBase = getApiBaseUrl();
  const token = getAdminToken();
  if (!token) {
    throw new Error("Missing admin token");
  }

  const res = await fetch(`${apiBase}/storage/ensure`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Failed to ensure storage bucket");
  }
}
