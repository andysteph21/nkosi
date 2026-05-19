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
      .eq("user_id", data.user.id)
      .maybeSingle()

    if (error) {
      console.warn(
        "[getProfile] profile query error for user",
        data.user.id,
        JSON.stringify({
          code: (error as { code?: string }).code,
          message: error.message,
        }),
      )
      return null
    }
    if (!profile) {
      // Auth session is valid but the profile row is missing. Happens when
      // the sign-up profile insert failed silently (or when an admin
      // manually deleted the profile but not the auth user). Logging this
      // explicitly because the user-visible symptom is "I clicked the
      // confirmation link but I'm not logged in" — which is misleading,
      // they ARE logged in, we just can't render their data.
      console.warn(
        "[getProfile] auth user exists but no profile row",
        JSON.stringify({ userId: data.user.id, email: data.user.email }),
      )
      return null
    }
    return profile as Profile
  } catch (err) {
    if (isNextInternalError(err)) throw err
    console.warn("[getProfile] failed:", err)
    return null
  }
}
