
const CACHE_NAME = "dopamine-app-v2";

const APP_SHELL = [
  "./index.html",
  "./offline.html",
  "./icon.png",
  "./logo.png",
  "./teacher.png",
  "./dopamine-icon-192.png",
  "./dopamine-icon-512.png"
];

const OFFLINE_URL = "./offline.html";

self.addEventListener("install", event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // Cache each file separately so one missing image
      // does not prevent offline.html from being cached.
      await cache.add("./offline.html");

      await Promise.allSettled(
        APP_SHELL
          .filter(url => url !== "./offline.html")
          .map(url => cache.add(url))
      );

      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames =>
        Promise.all(
          cacheNames
            .filter(
              cacheName =>
                cacheName.startsWith("dopamine-app-") &&
                cacheName !== CACHE_NAME
            )
            .map(cacheName => caches.delete(cacheName))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;

  if (
    request.method !== "GET" ||
    new URL(request.url).origin !== self.location.origin
  ) {
    return;
  }

  // Navigation: network first, offline page as fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();

            caches.open(CACHE_NAME).then(cache =>
              cache.put(request, copy)
            ).catch(() => {});
          }

          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);

          return (
            await cache.match(OFFLINE_URL) ||
            await cache.match("./index.html") ||
            new Response("You are offline.", {
              status: 503,
              headers: {
                "Content-Type": "text/plain; charset=utf-8"
              }
            })
          );
        })
    );

    return;
  }

  // Images and other requested resources.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);

      if (cached) return cached;

      try {
        const response = await fetch(request);

        if (response.ok) {
          cache.put(request, response.clone()).catch(() => {});
        }

        return response;
      } catch {
        return new Response("", { status: 504 });
      }
    })()
  );
});
