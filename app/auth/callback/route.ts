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
 *   - PKCE / OAuth-style: ?code=...        → exchangeCodeForSession
 *   - Implicit OTP:       ?token_hash=...&type=... → verifyOtp
 *
 * The cookies set during the exchange are bound to the redirect response
 * directly (not to the shared next/headers cookies() store), otherwise
 * they would be dropped by the immediate NextResponse.redirect() that
 * follows.
 *
 * Verbose logging at every decision point: a confirmation that lands
 * here but doesn't log the user in is usually one of
 *   (a) no code / no token in the URL
 *   (b) the exchange returned an error (expired, already used, mismatched)
 *   (c) the cookies setAll callback was never invoked (cookie binding bug)
 *   (d) the cookies ARE set but the redirect target hits middleware that
 *       drops them
 * The logs below let us tell those four apart from `docker compose logs`.
 */
export async function GET(request: Request) {
  // Short request id so multi-line logs from concurrent users stay grouped.
  const reqId = Math.random().toString(36).slice(2, 8)
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const tokenHash = requestUrl.searchParams.get("token_hash")
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null
  const redirectTo = requestUrl.searchParams.get("redirect_to") ?? "/"

  // What did we receive? Never log the raw code/token (they are single-use
  // credentials); log only their presence and length so we can tell
  // "no code at all" from "code present but too short".
  console.log(
    TAG,
    reqId,
    "incoming",
    JSON.stringify({
      hasCode: Boolean(code),
      codeLen: code?.length ?? 0,
      hasTokenHash: Boolean(tokenHash),
      tokenLen: tokenHash?.length ?? 0,
      type,
      redirectTo,
      origin: requestUrl.origin,
    }),
  )

  // Derive the public origin from the X-Forwarded-* headers set by Caddy
  // rather than from request.url. In Next.js standalone mode, request.url is
  // built from the container's bind address (0.0.0.0:3000), so using its
  // origin for the Location header would send the browser to a non-routable
  // address and produce ERR_ADDRESS_INVALID.
  const publicOrigin = await getSiteOrigin()
  const response = NextResponse.redirect(new URL(redirectTo, publicOrigin))

  // Count how many cookies the SDK asks us to set during the exchange.
  // Zero means the SDK considered the exchange a failure even if no error
  // was returned (rare but possible on stale flow states).
  let setCookieCalls = 0
  let setCookieNames: string[] = []

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
          setCookieCalls++
          setCookieNames.push(...cookiesToSet.map((c) => c.name))
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error(
        TAG,
        reqId,
        "exchangeCodeForSession FAILED",
        JSON.stringify({
          name: error.name,
          code: (error as { code?: string }).code ?? null,
          status: (error as { status?: number }).status ?? null,
          message: error.message,
        }),
      )
    } else {
      console.log(
        TAG,
        reqId,
        "exchangeCodeForSession ok",
        JSON.stringify({
          hasSession: Boolean(data?.session),
          hasUser: Boolean(data?.user),
          userId: data?.user?.id ?? null,
        }),
      )
    }
  } else if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (error) {
      console.error(
        TAG,
        reqId,
        "verifyOtp FAILED",
        JSON.stringify({
          type,
          name: error.name,
          code: (error as { code?: string }).code ?? null,
          status: (error as { status?: number }).status ?? null,
          message: error.message,
        }),
      )
    } else {
      console.log(
        TAG,
        reqId,
        "verifyOtp ok",
        JSON.stringify({
          type,
          hasSession: Boolean(data?.session),
          hasUser: Boolean(data?.user),
          userId: data?.user?.id ?? null,
        }),
      )
    }
  } else {
    console.warn(TAG, reqId, "no code and no token_hash — nothing to exchange")
  }

  console.log(
    TAG,
    reqId,
    "cookies set during exchange",
    JSON.stringify({
      calls: setCookieCalls,
      names: setCookieNames,
    }),
  )

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    console.error(
      TAG,
      reqId,
      "getUser FAILED after exchange",
      JSON.stringify({
        name: userError.name,
        code: (userError as { code?: string }).code ?? null,
        status: (userError as { status?: number }).status ?? null,
        message: userError.message,
      }),
    )
  } else {
    console.log(
      TAG,
      reqId,
      "getUser result",
      JSON.stringify({
        hasUser: Boolean(user),
        userId: user?.id ?? null,
        confirmed: Boolean(user?.email_confirmed_at),
      }),
    )
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
        console.error(TAG, reqId, "autoLike profile lookup FAILED", profileError.message)
      } else if (profile?.role === "client") {
        const restaurantId = Number(autoLike)
        const { data: existing, error: existingError } = await supabase
          .from("favorite")
          .select("profile_id")
          .eq("profile_id", profile.id)
          .eq("restaurant_id", restaurantId)
          .maybeSingle()
        if (existingError) {
          console.error(TAG, reqId, "autoLike existing-favorite lookup FAILED", existingError.message)
        }
        if (!existing) {
          const { error: insertError } = await supabase
            .from("favorite")
            .insert({ profile_id: profile.id, restaurant_id: restaurantId })
          if (insertError) {
            console.error(TAG, reqId, "autoLike favorite insert FAILED", insertError.message)
          } else {
            const { error: rpcError } = await supabase.rpc("increment_restaurant_likes", {
              p_restaurant_id: restaurantId,
            })
            if (rpcError) {
              console.error(TAG, reqId, "autoLike rpc increment FAILED", rpcError.message)
            } else {
              console.log(TAG, reqId, "autoLike applied for restaurant", restaurantId)
            }
          }
        } else {
          console.log(TAG, reqId, "autoLike already present, skipping")
        }
      }
    }
  }

  console.log(
    TAG,
    reqId,
    "redirecting to",
    JSON.stringify({
      to: redirectTo,
      publicOrigin,
      cookiesAttached: response.cookies.getAll().map((c) => c.name),
    }),
  )

  return response
}
