const UNSPLASH_HOST = "images.unsplash.com";

const sanitizeSize = (value: number) => {
  if (!Number.isFinite(value)) return 720;
  return Math.max(240, Math.min(1920, Math.round(value)));
};

const sanitizeQuality = (value: number) => {
  if (!Number.isFinite(value)) return 70;
  return Math.max(40, Math.min(90, Math.round(value)));
};

export const optimizeImageUrl = (
  rawUrl: string | null | undefined,
  width = 720,
  quality = 70,
) => {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  const url = rawUrl.trim();
  if (!url) return "";

  if (url.startsWith("/") || url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  const targetWidth = sanitizeSize(width);
  const targetQuality = sanitizeQuality(quality);
  const host = parsed.hostname.toLowerCase();

  if (host.includes(UNSPLASH_HOST)) {
    parsed.searchParams.set("w", String(targetWidth));
    parsed.searchParams.set("q", String(targetQuality));
    parsed.searchParams.set("fit", "max");
    parsed.searchParams.set("auto", "format,compress");
    return parsed.toString();
  }

  const isSupabaseStorageHost = host.includes("supabase.co");
  const hasPublicPath = parsed.pathname.includes("/storage/v1/object/public/");
  const hasRenderPath = parsed.pathname.includes("/storage/v1/render/image/public/");

  if (isSupabaseStorageHost && hasPublicPath) {
    parsed.pathname = parsed.pathname.replace(
      "/storage/v1/object/public/",
      "/storage/v1/render/image/public/",
    );
  }

  if (isSupabaseStorageHost && (hasPublicPath || hasRenderPath)) {
    parsed.searchParams.set("width", String(targetWidth));
    parsed.searchParams.set("quality", String(targetQuality));
    return parsed.toString();
  }

  return url;
};

export const buildCardImageSources = (url: string) => {
  const base = optimizeImageUrl(url, 640, 68);
  return {
    src: base || url,
    srcSet: [
      `${optimizeImageUrl(url, 360, 60) || url} 360w`,
      `${optimizeImageUrl(url, 640, 68) || url} 640w`,
      `${optimizeImageUrl(url, 960, 72) || url} 960w`,
    ].join(", "),
  };
};
