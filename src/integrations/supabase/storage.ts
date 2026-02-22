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

export async function uploadCmsFile(file: File, path: string) {
  const apiBase = getApiBaseUrl();
  const token = getAdminToken();
  if (!token) {
    throw new Error("Missing admin token");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("path", path);

  const res = await fetch(`${apiBase}/storage/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });

  if (!res.ok) {
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.message || "Failed to upload file");
    }

    const text = await res.text().catch(() => "");
    throw new Error(text || "Failed to upload file");
  }

  const data = await res.json();
  if (!data?.publicUrl) {
    throw new Error("Missing uploaded file URL");
  }

  return String(data.publicUrl);
}
