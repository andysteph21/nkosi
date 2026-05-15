import { createClient } from "@/lib/supabase/server"
import type { Profile } from "@/lib/types"
import { isNextInternalError } from "@/lib/next-errors"

export default async function getProfile(): Promise<Profile | null> {
  try {
    const supabase = await createClient()
    const { data, error: authError } = await supabase.auth.getUser()
    if (authError || !data?.user) return null

    const { data: profile, error } = await supabase
      .from("profile")
      .select("*")
<<<<<<< HEAD
      .eq("user_id", data.user.id)
      .maybeSingle()

    if (error || !profile) return null
    return profile as Profile
  } catch (err) {
    // Next.js throws sentinel errors (NEXT_REDIRECT, NEXT_NOT_FOUND,
    // DYNAMIC_SERVER_USAGE) to control the render. Let them bubble up.
    if (isNextInternalError(err)) throw err
    // Real error (network, transient auth failure): treat as unauthenticated.
    console.warn("[getProfile] failed:", err)
    return null
  }
}
=======
      .
>>>>>>> 8dde59e26ef77ba9354eaf587ce3be60178a38f4
