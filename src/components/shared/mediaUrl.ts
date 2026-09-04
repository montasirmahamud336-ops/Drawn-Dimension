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
// The media service intentionally sends `Cross-Origin-Resource-Policy: same-origin`.
// In local development, serve it through Vite's same-origin `/cms-media` proxy so
// the browser does not block production media URLs requested from localhost.
const shouldUseLocalMediaProxy = () =>
  typeof window !== "undefined" && isLoopbackHost(window.location.hostname.toLowerCase());
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

const isVpsMediaPath = (pathname: string) =>
  pathname.startsWith("/media/") || pathname.startsWith("/cms-media/");

const IMAGE_EXT_REGEX = /\.(jpe?g|png|webp|avif)$/i;

const getVpsImageVariantPath = (pathname: string, targetWidth: number) => {
  if (/-(360w|640w|960w)\.webp$/i.test(pathname) || !IMAGE_EXT_REGEX.test(pathname)) {
    return pathname;
  }

  let suffix = "960w";
  if (targetWidth <= 420) {
    suffix = "360w";
  } else if (targetWidth <= 750) {
    suffix = "640w";
  } else if (targetWidth > 1200) {
    return pathname;
  }

  return pathname.replace(IMAGE_EXT_REGEX, `-${suffix}.webp`);
};

export const optimizeImageUrl = (
  rawUrl: string | null | undefined,
  width = 720,
  quality = 70,
  height?: number,
) => {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  let url = rawUrl.trim();
  if (!url) return "";

  // Normalize apex domain to www to avoid 301 redirect hops
  if (url.startsWith("https://drawndimension.com/") || url.startsWith("http://drawndimension.com/")) {
    url = url.replace(/^https?:\/\/drawndimension\.com\//, "https://www.drawndimension.com/");
  }

  const targetWidth = sanitizeSize(width);
  const targetQuality = sanitizeQuality(quality);
  const targetHeight = sanitizeHeight(height);

  // Handle local/relative VPS media paths
  if (isVpsMediaPath(url)) {
    const [pathPart, searchPart] = url.split("?");
    const variantPath = getVpsImageVariantPath(pathPart, targetWidth);
    return searchPart ? `${variantPath}?${searchPart}` : variantPath;
  }

  if (url.startsWith("/") || url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  const host = parsed.hostname.toLowerCase();
  if (host === "drawndimension.com") {
    parsed.hostname = "www.drawndimension.com";
  }

  // Handle VPS Media URLs hosted on production domain
  if (
    (PROD_MEDIA_HOSTS.has(parsed.hostname.toLowerCase()) || isLoopbackHost(parsed.hostname.toLowerCase())) &&
    isVpsMediaPath(parsed.pathname)
  ) {
    parsed.pathname = getVpsImageVariantPath(parsed.pathname, targetWidth);
    return parsed.toString();
  }

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
  let url = rawUrl.trim();
  if (!url) return "";

  // Normalize apex domain to www to avoid 301 redirect
  if (url.startsWith("https://drawndimension.com/") || url.startsWith("http://drawndimension.com/")) {
    url = url.replace(/^https?:\/\/drawndimension\.com\//, "https://www.drawndimension.com/");
  }

  if (url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }

  // Rewrite legacy Supabase storage URLs to local/VPS media path
  if (url.includes(".supabase.co/storage/v1/object/public/")) {
    url = url.replace(/^https?:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/public\//, "/media/");
  }

  // Handle bare filenames like '1772029652709-2jl4eo3qglb.jpeg'
  if (!url.startsWith("/") && !url.startsWith("http://") && !url.startsWith("https://")) {
    url = `/media/cms-uploads/${url}`;
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
    
    if (url.startsWith("/media/")) {
      return buildCanonicalMediaUrl(url);
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
  let url = rawUrl.trim();
  if (!url) return "";

  if (url.startsWith("https://drawndimension.com/") || url.startsWith("http://drawndimension.com/")) {
    url = url.replace(/^https?:\/\/drawndimension\.com\//, "https://www.drawndimension.com/");
  }

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
  const fallbackSrc = resolvedUrl || url;
  const base = optimizeImageUrl(resolvedUrl, 640, 68, 360);
  return {
    src: base || fallbackSrc,
    fallbackSrc,
    srcSet: [
      `${optimizeImageUrl(resolvedUrl, 360, 60, 203) || fallbackSrc} 360w`,
      `${optimizeImageUrl(resolvedUrl, 640, 68, 360) || fallbackSrc} 640w`,
      `${optimizeImageUrl(resolvedUrl, 960, 72, 540) || fallbackSrc} 960w`,
    ].join(", "),
  };
};
