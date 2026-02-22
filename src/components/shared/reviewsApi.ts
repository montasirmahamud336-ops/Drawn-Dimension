import { getApiBaseUrl } from "@/components/admin/adminAuth";

export const getReviewsApiBase = () => {
  const envBase = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
  if (envBase && envBase.trim().length > 0) {
    return envBase.replace(/\/$/, "");
  }

  return getApiBaseUrl().replace(/\/$/, "");
};
