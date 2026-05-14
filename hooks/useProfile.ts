import { createClient } from "@/lib/supabase/server"
import type { Profile } from "@/lib/types"

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

    