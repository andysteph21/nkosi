import { createClient } from "@/lib/supabase/server"
import type { Profile } from "@/lib/types"

export default async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from("profile")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (error || !data) return null
  return data as Profile
}
