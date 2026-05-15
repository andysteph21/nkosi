"use client"

import { useEffect } from "react"

/**
 * EMERGENCY KILL-SWITCH (temporary):
 *
 * The previously-deployed service worker (versioned 'v1') intercepted
 * /_next/static/* with a CacheFirst strategy. After a hot redeploy,
 * browsers were loading a mix of stale + fresh chunks and crashing at
 * hydration with 'ReferenceError: ads is not defined' (turbopack module
 * evaluation). To rescue users in the wild, this component now
 * unregisters any active service worker and purges all caches on first
 * mount, then never re-registers.
 *
 * Once everyone has loaded the page once with this build, we can flip
 * the strategy: bump sw.js CACHE_VERSION, use NetworkFirst for chunks,
 * and re-enable registration.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator)) return

    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        for (const registration of registrations) {
          registration.unregister().catch(() => {})
        }
      })
      .catch(() => {})

    if ("caches" in window) {
      caches
        .keys()
        .then((names) => Promise.all(names.map((name) => caches.delete(name))))
        .catch(() => {})
    }
  }, [])

  return null
}
