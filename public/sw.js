/* eslint-disable */
/**
 * NKOSI service worker — offline-friendly caching for flaky / 2G / 3G networks.
 *
 * Strategies:
 *   - Same-origin HTML navigations  → NetworkFirst, 3 s timeout, fallback to
 *                                     last cached version, finally /offline.
 *   - /_next/static/*                → CacheFirst, immutable.
 *   - /images/* and /icon*, etc.     → CacheFirst.
 *   - Supabase Storage public URLs   → CacheFirst, 30 days.
 *   - Everything else                → NetworkOnly (PostgREST mutations,
 *                                     auth, RPCs — never cache these).
 *
 * Bump CACHE_VERSION when you change strategies; old caches are nuked on
 * activate.
 */

const CACHE_VERSION = "v1"
const PAGE_CACHE = `nkosi-pages-${CACHE_VERSION}`
const STATIC_CACHE = `nkosi-static-${CACHE_VERSION}`
const MEDIA_CACHE = `nkosi-media-${CACHE_VERSION}`
const OFFLINE_URL = "/offline"

const KNOWN_CACHES = [PAGE_CACHE, STATIC_CACHE, MEDIA_CACHE]

// ---------------------------------------------------------------------------
// Install: pre-cache the offline page so it's available the very first time
// the network fails.
// ---------------------------------------------------------------------------
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PAGE_CACHE).then((cache) => cache.add(OFFLINE_URL)),
  )
  self.skipWaiting()
})

// ---------------------------------------------------------------------------
// Activate: drop caches from previous SW versions and claim open tabs.
// ---------------------------------------------------------------------------
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys.filter((k) => !KNOWN_CACHES.includes(k)).map((k) => caches.delete(k)),
      )
      await self.clients.claim()
    })(),
  )
})

// ---------------------------------------------------------------------------
// Fetch routing
// ---------------------------------------------------------------------------
self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return

  const url = new URL(request.url)

  // 1. Same-origin HTML navigation: network-first w/ 3 s budget, then cache,
  //    then offline shell.
  if (request.mode === "navigate") {
    event.respondWith(handleNavigate(request))
    return
  }

  // 2. Next.js immutable chunks.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // 3. /public assets.
  if (
    url.origin === self.location.origin &&
    /^\/(images\/|icon|apple-icon|favicon|placeholder)/i.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // 4. Supabase Storage public objects (any project ref on supabase.co).
  if (
    url.hostname.endsWith(".supabase.co") &&
    url.pathname.startsWith("/storage/v1/object/public/")
  ) {
    event.respondWith(cacheFirst(request, MEDIA_CACHE))
    return
  }

  // 5. Everything else: pass through. We don't cache REST/RPC/auth.
})

// ---------------------------------------------------------------------------
// Strategies
// ---------------------------------------------------------------------------

async function handleNavigate(request) {
  const cache = await caches.open(PAGE_CACHE)
  try {
    const response = await timedFetch(request, 3000)
    // Cache successful HTML responses so a future offline visit works.
    if (response && response.ok) cache.put(request, response.clone())
    return response
  } catch {
    const cached = await cache.match(request)
    if (cached) return cached
    const offline = await cache.match(OFFLINE_URL)
    if (offline) return offline
    return new Response("Hors connexion", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    })
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) {
    // Async revalidation in the background so the cache slowly catches up
    // with origin without ever blocking the user.
    fetch(request).then((r) => { if (r && r.ok) cache.put(request, r.clone()) }).catch(() => {})
    return cached
  }
  try {
    const response = await fetch(request)
    if (response && response.ok) cache.put(request, response.clone())
    return response
  } catch (err) {
    return new Response("", { status: 504 })
  }
}

function timedFetch(request, timeoutMs) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), timeoutMs)
    fetch(request, { signal: controller.signal })
      .then((r) => { clearTimeout(t); resolve(r) })
      .catch((e) => { clearTimeout(t); reject(e) })
  })
}
