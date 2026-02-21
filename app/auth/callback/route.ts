import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const redirectTo = requestUrl.searchParams.get("redirect_to") ?? "/"

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const autoLike = user?.user_metadata?.auto_like
    if (autoLike) {
      const { data: profile } = await supabase.from("profile").select("id,role").eq("user_id", user.id).maybeSingle()
      if (profile?.role === "client") {
        await supabase.from("favorite").upsert({ profile_id: profile.id, restaurant_id: Number(autoLike) })
        await supabase.rpc("increment_restaurant_likes", { p_restaurant_id: Number(autoLike) })
      }
    }
  }

  return NextResponse.redirect(new URL(redirectTo, requestUrl.origin))
}
