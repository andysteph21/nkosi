import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import type { EmailOtpType } from "@supabase/supabase-js"
import { supabaseFetch } from "@/lib/supabase/fetch"
import { getSiteOrigin } from "@/lib/site-url"

const TAG = "[auth/callback]"

/**
 * GET /auth/callback
 *
 * Handles both flows Supabase Auth can use after an email confirmation
 * link / magic link / password recovery link:
 *
 *   - PKCE / OAuth-style: ?code=...                 -> exchangeCodeForSession
 *   - Token hash:         ?token_hash=...&type=...   -> verifyOtp
 *
 * The cookies set during the exchange are bound to the redirect response
 * directly (not to the shared next/headers cookies() store), otherwise they
 * would be dropped by the immediate NextResponse.redirect() that follows.
 *
 * Only genuine failures are logged (console.error). A short request id keeps
 * concurrent failures grouped.
 */
export async function GET(request: Request) {
  const reqId = Math.random().toString(36).slice(2, 8)
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const tokenHash = requestUrl.searchParams.get("token_hash")
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null
  const redirectTo = requestUrl.searchParams.get("redirect_to") ?? "/"

  // Derive the public origin from the X-Forwarded-* headers set by Caddy
  // rather than from request.url. In Next.js standalone mode, request.url is
  // built from the container's bind address (0.0.0.0:3000), so using its
  // origin for the Location header would send the browser to a non-routable
  // address and produce ERR_ADDRESS_INVALID.
  const publicOrigin = await getSiteOrigin()
  const response = NextResponse.redirect(new URL(redirectTo, publicOrigin))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { fetch: supabaseFetch },
      cookies: {
        getAll() {
          return (
            request.headers
              .get("cookie")
              ?.split("; ")
              .map((c) => {
                const [name, ...rest] = c.split("=")
                return { name, value: rest.join("=") }
              }) ?? []
          )
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error(
        TAG,
        reqId,
        "exchangeCodeForSession failed:",
        JSON.stringify({
          name: error.name,
          code: (error as { code?: string }).code ?? null,
          status: (error as { status?: number }).status ?? null,
          message: error.message,
        }),
      )
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (error) {
      console.error(
        TAG,
        reqId,
        "verifyOtp failed:",
        JSON.stringify({
          type,
          name: error.name,
          code: (error as { code?: string }).code ?? null,
          status: (error as { status?: number }).status ?? null,
          message: error.message,
        }),
      )
    }
  } else {
    console.warn(TAG, reqId, "no code and no token_hash — nothing to exchange")
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    console.error(TAG, reqId, "getUser failed after exchange:", userError.message)
  }

  if (user) {
    const autoLike = user.user_metadata?.auto_like
    if (autoLike) {
      const { data: profile, error: profileError } = await supabase
        .from("profile")
        .select("id,role")
        .eq("user_id", user.id)
        .maybeSingle()
      if (profileError) {
        console.error(TAG, reqId, "autoLike profile lookup failed:", profileError.message)
      } else if (profile?.role === "client") {
        const restaurantId = Number(autoLike)
        const { data: existing, error: existingError } = await supabase
          .from("favorite")
          .select("profile_id")
          .eq("profile_id", profile.id)
          .eq("restaurant_id", restaurantId)
          .maybeSingle()
        if (existingError) {
          console.error(TAG, reqId, "autoLike existing-favorite lookup failed:", existingError.message)
        }
        if (!existing) {
          const { error: insertError } = await supabase
            .from("favorite")
            .insert({ profile_id: profile.id, restaurant_id: restaurantId })
          if (insertError) {
            console.error(TAG, reqId, "autoLike favorite insert failed:", insertError.message)
          } else {
            const { error: rpcError } = await supabase.rpc("increment_restaurant_likes", {
              p_restaurant_id: restaurantId,
            })
            if (rpcError) {
              console.error(TAG, reqId, "autoLike rpc increment failed:", rpcError.message)
            }
          }
        }
      }
    }
  }

  return response
}
