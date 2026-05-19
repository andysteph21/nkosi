import { headers } from "next/headers"

/**
 * Returns the public origin (scheme + host) of the current request, as seen
 * by the visitor — e.g. "https://nkosiadvances.com".
 *
 * Reads the standard reverse-proxy headers set by Caddy
 * (X-Forwarded-Host / X-Forwarded-Proto, with a fallback to Host). Use this
 * for anything that ends up in an outgoing email or otherwise crosses back
 * to the user, instead of process.env.NEXT_PUBLIC_BASE_URL.
 *
 * Why not the env var? NEXT_PUBLIC_BASE_URL is inlined by Next.js at build
 * time. If the build was run with the wrong value (or empty) the bundle is
 * frozen to that value, and Supabase silently falls back to the dashboard
 * Site URL — which is how production password-reset links once shipped with
 * "https://0.0.0.0:3000". Reading the live request header makes that class
 * of bug impossible.
 *
 * Throws if no host header is present, which should never happen for a
 * real HTTP request reaching a Server Action.
 */
export async function getSiteOrigin(): Promise<string> {
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host")
  if (!host) {
    throw new Error("getSiteOrigin: no Host header on the incoming request")
  }
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https")
  return `${proto}://${host}`
}
