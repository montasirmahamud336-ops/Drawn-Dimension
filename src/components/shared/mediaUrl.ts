const UNSPLASH_HOST = "images.unsplash.com";
const PROD_SITE_ORIGIN = "https://www.drawndimension.com";
const PROD_MEDIA_HOSTS = new Set(["drawndimension.com", "www.drawndimension.com", "api.drawndimension.com"]);
const LOCAL_MEDIA_PROXY_PREFIX = "/cms-media";
const isLoopbackHost = (host: string) => host === "localhost" || host === "127.0.0.1" || host === "::1";
const normalizeConfiguredHost = (value?: string) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  try {
    const parsed = new URL(raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`);
    return parsed.hostname.toLowerCase();
  } catch {
    return "";
  }
};
const configuredApiHost = normalizeConfiguredHost((import.meta as any).env?.VITE_API_BASE_URL as string | undefined);
const shouldUseLocalMediaProxy = () =>
  typeof window !== "undefined" &&
  isLoopbackHost(window.location.hostname.toLowerCase());
const isProductionWebsiteHost = (host: string) =>
  host === "drawndimension.com" || host === "www.drawndimension.com";
const buildLocalProxyUrl = (pathname: string, search = "") =>
  `${LOCAL_MEDIA_PROXY_PREFIX}${pathname.replace(/^\/media/, "")}${search}`;
const buildCanonicalMediaUrl = (pathname: string, search = "") => {
  if (typeof window !== "undefined") {
    const currentHost = window.location.hostname.toLowerCase();
    if (isProductionWebsiteHost(currentHost)) {
      return `${window.location.origin.replace(/\/+$/, "")}${pathname}${search}`;
    }
  }

  return `${PROD_SITE_ORIGIN}${pathname}${search}`;
};

const sanitizeSize = (value: number) => {
  if (!Number.isFinite(value)) return 720;
  return Math.max(240, Math.min(1920, Math.round(value)));
};

const sanitizeQuality = (value: number) => {
  if (!Number.isFinite(value)) return 70;
  return Math.max(40, Math.min(90, Math.round(value)));
};

const sanitizeHeight = (value: number | undefined) => {
  if (!Number.isFinite(value)) return undefined;
  return Math.max(160, Math.min(1920, Math.round(value)));
};

export const optimizeImageUrl = (
  rawUrl: string | null | undefined,
  width = 720,
  quality = 70,
  height?: number,
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
  const targetHeight = sanitizeHeight(height);
  const host = parsed.hostname.toLowerCase();

  if (host.includes(UNSPLASH_HOST)) {
    parsed.searchParams.set("w", String(targetWidth));
    parsed.searchParams.set("q", String(targetQuality));
    if (targetHeight) {
      parsed.searchParams.set("h", String(targetHeight));
      parsed.searchParams.set("fit", "crop");
    } else {
      parsed.searchParams.set("fit", "max");
    }
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
    if (targetHeight) {
      parsed.searchParams.set("height", String(targetHeight));
      parsed.searchParams.set("resize", "cover");
    } else {
      parsed.searchParams.delete("height");
      parsed.searchParams.delete("resize");
    }
    return parsed.toString();
  }

  return url;
};

export const resolveCmsMediaUrl = (rawUrl: string | null | undefined) => {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  const url = rawUrl.trim();
  if (!url) return "";

  if (url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }

  try {
    const parsed = new URL(url);
    const currentHost =
      typeof window !== "undefined" ? window.location.hostname.toLowerCase() : "";
    const targetHost = parsed.hostname.toLowerCase();
    const isMediaPath = parsed.pathname.startsWith("/media/");

    if (
      isMediaPath &&
      shouldUseLocalMediaProxy() &&
      currentHost &&
      (PROD_MEDIA_HOSTS.has(targetHost) || isLoopbackHost(targetHost) || targetHost === configuredApiHost)
    ) {
      return buildLocalProxyUrl(parsed.pathname, parsed.search);
    }

    if (isMediaPath && (PROD_MEDIA_HOSTS.has(targetHost) || isLoopbackHost(targetHost))) {
      return buildCanonicalMediaUrl(parsed.pathname, parsed.search);
    }
  } catch {
    if (shouldUseLocalMediaProxy() && url.startsWith("/media/")) {
      return buildLocalProxyUrl(url);
    }

    return url;
  }

  if (shouldUseLocalMediaProxy() && url.startsWith("/media/")) {
    return buildLocalProxyUrl(url);
  }

  return url;
};

export const normalizeCmsStoredMediaUrl = (rawUrl: string | null | undefined) => {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  const url = rawUrl.trim();
  if (!url) return "";

  try {
    const parsed = new URL(url);
    if (isLoopbackHost(parsed.hostname.toLowerCase()) && parsed.pathname.startsWith("/media/")) {
      return buildCanonicalMediaUrl(parsed.pathname, parsed.search);
    }
  } catch {
    if (url.startsWith("/media/")) {
      return buildCanonicalMediaUrl(url);
    }
  }

  return url;
};

export const buildCardImageSources = (url: string) => {
  const resolvedUrl = resolveCmsMediaUrl(url);
  const base = optimizeImageUrl(resolvedUrl, 640, 68, 360);
  return {
    src: base || resolvedUrl || url,
    srcSet: [
      `${optimizeImageUrl(resolvedUrl, 360, 60, 203) || resolvedUrl || url} 360w`,
      `${optimizeImageUrl(resolvedUrl, 640, 68, 360) || resolvedUrl || url} 640w`,
      `${optimizeImageUrl(resolvedUrl, 960, 72, 540) || resolvedUrl || url} 960w`,
    ].join(", "),
  };
};
