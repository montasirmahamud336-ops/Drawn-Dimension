// DrawnDimension High-Performance Image & Asset Service Worker
const CACHE_NAME = "dd-media-cache-v1";
const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif", ".ico", ".avif"];

// Check if request is an image or static media
function isImageRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname.toLowerCase();
  
  if (request.destination === "image") return true;
  if (pathname.includes("/media/") || pathname.includes("/uploads/") || pathname.includes("/images/")) {
    return true;
  }
  return IMAGE_EXTENSIONS.some((ext) => pathname.endsWith(ext));
}

// Install Event
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// Activate Event
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Cache-First with Network Revalidation for images
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET requests for images
  if (request.method !== "GET" || !isImageRequest(request)) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 1. Check if we already have it in browser cache
      const cachedResponse = await cache.match(request);
      
      // Fetch fresh version in background or as fallback
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            // Save a clone in CacheStorage
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline/network fails and we had a cached version, return cached
          return cachedResponse;
        });

      // If cached response exists, return it immediately (0ms instant load!)
      // Otherwise wait for network fetch
      return cachedResponse || fetchPromise;
    })
  );
});
