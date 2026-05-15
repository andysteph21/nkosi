/* eslint-disable */
/**
 * EMERGENCY KILL-SWITCH (temporary).
 *
 * The previous service worker (v1) was caching /_next/static/* with a
 * CacheFirst strategy and producing 'ReferenceError: ads is not defined'
 * after hot redeploys (mix of stale + fresh Turbopack chunks).
 *
 * This replacement SW does nothing except:
 *   1. On install, immediately skip waiting.
 *   2. On activate, take control of all open clients, delete every cache,
 *      and unregister itself.
 *   3. Pass every fetch through to the network untouched.
 *
 * After a single navigation the SW is gone and the browser falls back to
 * its default cache (which respects Cache-Control). We can ship a new,
 * safer SW later.
 */

self.addEventListener("install", (event) => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k)))
      } catch {}
      try {
        await self.clients.claim()
      } catch {}
      try {
        await self.registration.unregister()
      } catch {}
      try {
        const all = await self.clients.matchAll()
        for (const client of all) client.navigate(client.url).catch(() => {})
      } catch {}
    })(),
  )
})

self.addEventListener("fetch", () => {
  // Pass-through: do not respondWith. Browser handles directly.
})
