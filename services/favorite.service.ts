import { createClient } from "@/lib/supabase/client"

export async function getMyFavorites() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase.from("profile").select("id").eq("user_id", user.id).maybeSingle()
  if (!profile) return []

  const { data, error } = await supabase
    .from("favorite")
    .select("restaurant_id,restaurant(*)")
    .eq("profile_id", profile.id)
  if (error) throw error
  return data ?? []
}

export async function toggleFavorite(restaurantId: number) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { requiresAuth: true }

  const { data: profile } = await supabase.from("profile").select("id,role").eq("user_id", user.id).single()
  if (!profile) return { requiresAuth: true }
  if (profile.role !== "client") return { clientOnly: true }
  const { data: existing } = await supabase
    .from("favorite")
    .select("profile_id,restaurant_id")
    .eq("profile_id", profile.id)
    .eq("restaurant_id", restaurantId)
    .maybeSingle()

  if (existing) {
    await supabase.from("favorite").delete().eq("profile_id", profile.id).eq("restaurant_id", restaurantId)
    await supabase.rpc("decrement_restaurant_likes", { p_restaurant_id: restaurantId })
    return { favorited: false }
  }

  await supabase.from("favorite").insert({ profile_id: profile.id, restaurant_id: restaurantId })
  await supabase.rpc("increment_restaurant_likes", { p_restaurant_id: restaurantId })
  return { favorited: true }
}
