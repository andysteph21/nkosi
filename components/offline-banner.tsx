"use client"

import { useSyncExternalStore } from "react"
import { WifiOff } from "lucide-react"

/**
 * Lightweight "you are offline" banner. Renders nothing when the browser
 * reports online status. Designed to sit at the very top of the layout
 * (above the Header) so users on flaky mobile networks notice immediately
 * that an action they take might fail or hit a stale cache.
 *
 * `navigator.onLine` is unreliable in absolute terms (a wifi connection
 * with no internet returns `true`), but it's a useful first-order signal.
 * The Supabase fetch wrapper's retry/timeout logic catches the cases this
 * banner misses.
 */
export function OfflineBanner() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    // Server-side: assume online to avoid SSR/CSR hydration mismatch.
    () => true,
  )

  if (online) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-amber-500 px-3 py-1.5 text-sm font-medium text-amber-950"
    >
      <WifiOff className="h-4 w-4" />
      <span>Hors connexion — affichage du cache local</span>
    </div>
  )
}

function subscribe(callback: () => void): () => void {
  window.addEventListener("online", callback)
  window.addEventListener("offline", callback)
  return () => {
    window.removeEventListener("online", callback)
    window.removeEventListener("offline", callback)
  }
}
