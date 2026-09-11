/* TAMBAYAN service worker — milestone 1.
   Cache-first, but ONLY for genuinely static, non-personalized assets: build
   output, PWA icons, brand images, the manifest, and image files. Navigation
   requests (full page loads / client-side route transitions) and RSC data
   fetches always go straight to the network, untouched by this worker, so
   that the proxy — session refresh, auth gating, the onboarding trap — runs
   on every one. Caching those would mean a signed-out browser could still be
   served the previous user's personalized HTML/RSC payload from a cache
   that's shared across everyone using that browser profile — the most
   serious way a milestone-1 "just cache everything" SW goes wrong.
   No push, no background sync yet. */

const CACHE = "tambayan-shell-v3";
// "/" is deliberately NOT precached: it's the root document, gated by the
// proxy on every request, and must never be served from a shared cache — see
// the fetch handler below.
const SHELL = ["/manifest.webmanifest", "/icons/icon-192.png"];

/** Static, non-personalized, same-origin assets only — safe to cache-first. */
function isCacheableAsset(url) {
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/_next/static/")) return true;
  if (url.pathname.startsWith("/icons/")) return true;
  if (url.pathname.startsWith("/brand/")) return true;
  if (url.pathname === "/manifest.webmanifest") return true;
  return /\.(?:png|jpe?g|gif|webp|svg|ico)$/i.test(url.pathname);
}

/** Next.js RSC data fetch (as opposed to a full document navigation). */
function isRscRequest(request, url) {
  return request.headers.has("RSC") || url.searchParams.has("_rsc");
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        // Evicts the old (poisoned, potentially cross-user) v2 cache along
        // with anything else stale — bumping CACHE above is what makes this
        // run for clients still holding it.
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations and RSC payloads carry session/auth state — never cache or
  // serve-from-cache these, let them hit the network so the proxy always
  // runs. Navigation requests use `redirect: "manual"`, so a proxy 307
  // resolves to an `opaqueredirect` response here; there's no document-shaped
  // fallback that's both safe (not personalized) and correct for that case,
  // so — deliberately — there is no offline fallback for navigations at all.
  if (request.mode === "navigate" || isRscRequest(request, url)) return;

  if (!isCacheableAsset(url)) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        // Only same-origin, successful, non-opaque responses are safe to
        // replay from cache.put() — opaque/opaqueredirect responses reject on
        // put, and caching an error response would serve it forever.
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches
            .open(CACHE)
            .then((cache) => cache.put(request, copy))
            .catch(() => {
              // Best-effort only — a failed cache write must never surface as
              // an unhandled rejection or affect the response we return.
            });
        }
        return response;
      });
    }),
  );
});
