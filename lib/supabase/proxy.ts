import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { createFetchWithRetry } from "@/lib/supabase/fetch"

// The proxy/middleware runs on every request. Keep its budget tight: short
// timeout, only one retry, so an Auth outage doesn't compound page-load
// latency for every visitor.
const middlewareFetch = createFetchWithRetry({ timeoutMs: 4_000, maxAttempts: 2 })

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { fetch: middlewareFetch },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data } = await supabase.auth.getClaims()
  const user = data?.claims ? { id: data.claims.sub as string } : null

  const path = request.nextUrl.pathname
  const isPublicPath =
    path === "/" ||
    path.startsWith("/restaurant/") ||
    path.startsWith("/contact") ||
    path.startsWith("/terms")

  const isAuthPath = path.startsWith("/sign-in") || path.startsWith("/sign-up")

  const isProtectedPath =
    path.startsWith("/admin") ||
    path.startsWith("/my-restaurant") ||
    path.startsWith("/profile") ||
    path.startsWith("/create-restaurant") ||
    path.startsWith("/first-setup")

  if (isAuthPath && user) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  if (!user && isProtectedPath) {
    return NextResponse.redirect(new URL("/sign-in", request.url))
  }

  return response
}
