import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { createFetchWithRetry } from "@/lib/supabase/fetch"

// The proxy/middleware runs on every request to a protected route. Give it
// a generous-but-bounded budget: an Auth call that takes 9 s is rare but not
// unheard of when the Supabase Auth service is cold-starting and the VPS is
// geographically far from the region. With a 4 s budget the middleware was
// throwing on every protected route after pull, producing Next's generic
// "This page could not load" error.
const middlewareFetch = createFetchWithRetry({ timeoutMs: 9_000, maxAttempts: 2 })

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

  // Defensive: if the Auth call throws (network blip, abort, etc.) we treat
  // the visitor as unauthenticated rather than crashing the middleware,
  // which would surface as Next's generic "This page could not load" error.
  let user: { id: string } | null = null
  try {
    const { data } = await supabase.auth.getClaims()
    user = data?.claims ? { id: data.claims.sub as string } : null
  } catch (err) {
    console.warn("[proxy] supabase.auth.getClaims failed:", err)
  }

  const path = request.nextUrl.pathname
  const isPublicPath =
    path === "/" ||
    path.startsWith("/restaurant/"