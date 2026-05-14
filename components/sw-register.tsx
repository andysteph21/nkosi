"use client"

import { useEffect } from "react"

/**
 * Registers /sw.js on mount. Renders nothing.
 *
 * In dev the service worker is intentionally NOT registered — caching makes
 * iterating on the app painful, and the dev server doesn't serve `/sw.js`
 * with the right Cache-Control headers anyway.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return
    if (process.env.NODE_ENV !== "production") return
    if (!("serviceWorker" in navigator)) return

    // Defer registration to after the page is fully interactive so we don't
    // compete with first-paint resources.
    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => {
          // Non-fatal: the app works without the SW, the user just doesn't
          // get the offline-friendly caching.
          console.warn("[sw] registration failed", err)
        })
    }

    if (document.readyState === "complete") {
      register()
    } else {
      window.addEventListener("load", register, { once: true })
    }
  }, [])

  return null
}
