import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import type { EmailOtpType } from "@supabase/supabase-js"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const tokenHash = requestUrl.searchParams.get("token_hash")
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null
  const redirectTo = requestUrl.searchParams.get("redirect_to") ?? "/"

  // Build the redirect response first so we can bind Supabase session cookies
  // directly to it. Using the shared `cookies()` store from next/headers would
  // attach cookies to a different response object and they would be lost on the
  // NextResponse.redirect() that follows.
  const response = NextResponse.redirect(new URL(redirectTo, requestUrl.origin))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.headers
            .get("cookie")
            ?.split("; ")
            .map((c) => {
              const [name, ...rest] = c.split("=")
              return { name, value: rest.join("=") }
            }) ?? []
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  if (code) {
    await supabase.auth.exchangeCodeForSession(code)
  } else if (tokenHash && type) {
    await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const autoLike = user.user_metadata?.auto_like
    if (autoLike) {
      const { data: profile } = await supabase
        .from("profile")
        .select("id,role")
        .eq("user_id", user.id)
        .maybeSingle()
      if (profile?.role === "client") {
        await supabase
          .from("favorite")
          .upsert({ profile_id: profile.id, restaurant_id: Number(autoLike) })
        await supabase.rpc("increment_restaurant_likes", {
          p_restaurant_id: Number(autoLike),
        })
      }
    }
  }

  return response
}
