import { createClient } from "@/lib/supabase/client"

export async function getMyNotifications() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []
  const { data: profile } = await supabase.from("profile").select("id").eq("user_id", user.id).single()
  if (!profile) return []
  const { data, error } = await supabase
    .from("notification")
    .select("*")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function markNotificationRead(id: number) {
  const supabase = createClient()
  const { error } = await supabase.from("notification").update({ is_read: true }).eq("id", id)
  if (error) throw error
}
