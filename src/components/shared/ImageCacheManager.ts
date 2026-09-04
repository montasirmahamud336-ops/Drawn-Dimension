import { getApiBaseUrl } from "@/components/admin/adminAuth";

const CACHE_NAME = "dd-media-cache-v1";

const CORE_STATIC_ASSETS = [
  "/images/logo.png",
  "/images/chief-executive-manager.png",
  "/images/hero_blueprint_bg.png",
  "/images/software/autocad.png",
  "/images/software/solidworks.png",
  "/images/software/visio.png",
  "/images/software/aspen.png",
  "/pdf-forge-logo.png",
];

// Register the Image Service Worker
export const registerImageServiceWorker = async () => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    if (registration.installing) {
      console.log("[ServiceWorker] Installing image cache worker...");
    }
  } catch (error) {
    console.debug("[ServiceWorker] Registration skipped or not supported in current environment", error);
  }
};

// Pre-cache an array of image URLs into both CacheStorage and browser memory
export const precacheImages = async (urls: string[]) => {
  if (typeof window === "undefined" || !Array.isArray(urls) || urls.length === 0) {
    return;
  }

  const cleanUrls = Array.from(
    new Set(
      urls
        .filter((url) => typeof url === "string" && url.trim().length > 0)
        .map((url) => url.trim())
    )
  );

  const hasCacheStorage = "caches" in window;
  let cache: Cache | null = null;

  if (hasCacheStorage) {
    try {
      cache = await window.caches.open(CACHE_NAME);
    } catch {
      cache = null;
    }
  }

  // Pre-load concurrently with a concurrency limiter
  const BATCH_SIZE = 4;
  for (let i = 0; i < cleanUrls.length; i += BATCH_SIZE) {
    const batch = cleanUrls.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (url) => {
        try {
          // 1. Cache in browser CacheStorage if available
          if (cache) {
            const match = await cache.match(url);
            if (!match) {
              await cache.add(url).catch(() => {
                // If cors prevents direct cache.add, fetch with no-cors or image preload
              });
            }
          }

          // 2. Preload into browser image memory
          const img = new Image();
          img.src = url;
        } catch {
          // Silently continue for next images
        }
      })
    );
  }
};

let hasRunPrecache = false;

// Pre-cache only lightweight core UI assets and top 3 portfolio cards (medium variant)
export const startBackgroundFullImagePrecache = () => {
  if (typeof window === "undefined" || hasRunPrecache) return;

  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  // Respect data-saver and slow connections
  if (nav.connection?.saveData || nav.connection?.effectiveType === "2g" || nav.connection?.effectiveType === "slow-2g") {
    return;
  }

  hasRunPrecache = true;

  const runTask = async () => {
    try {
      // 1. Preload small core UI static icons/logos
      await precacheImages(CORE_STATIC_ASSETS);

      const apiBase = getApiBaseUrl();

      // 2. Fetch only the top 3 live portfolio projects for quick hero card display
      const res = await fetch(`${apiBase}/projects?status=live`).catch(() => null);
      if (!res || !res.ok) return;

      const projects = await res.json().catch(() => []);
      if (!Array.isArray(projects)) return;

      // Extract only the top 3 project images, requesting medium (640w) variant
      const priorityUrls = projects
        .slice(0, 3)
        .map((p: any) => p?.image_url || (Array.isArray(p?.media) && p.media[0]?.url))
        .filter((url): url is string => typeof url === "string" && url.trim().length > 0);

      if (priorityUrls.length > 0) {
        await precacheImages(priorityUrls);
      }
    } catch {
      // Background task silently completes
    }
  };

  // Run only during idle period after page is interactive
  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(runTask, { timeout: 8000 });
  } else {
    setTimeout(runTask, 5000);
  }
};
