import { createClient } from "@/lib/supabase/client"
import { createServerClient } from "@supabase/ssr"

export type ToggleFavoriteResult =
  | { requiresAuth: true }
  | { clientOnly: true }
  | { favorited: boolean }

export interface FavoriteStripItem {
  restaurant_id: number
  restaurant: {
    id: number
    name: string
    city: string
    neighborhood: string
    cover: { path?: string } | null
  } | null
}

/**
 * Server-side helper: fetches the minimal favorite data needed for the strip.
 * Accepts any Supabase client so the page server component can pass its own
 * cookie-aware instance. Returns [] for unauthenticated users.
 */
export async function getMyFavoritesForStrip(
  supabase: ReturnType<typeof createClient> | Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
): Promise<FavoriteStripItem[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    const { data: profile } = await supabase
      .from("profile")
      .select("id,role")
      .eq("user_id", user.id)
      .maybeSingle()
    if (!profile || profile.role !== "client") return []
    const { data } = await supabase
      .from("favorite")
      .select("restaurant_id,restaurant(id,name,city,neighborhood,cover)")
      .eq("profile_id", profile.id)
    return (data ?? []) as unknown as FavoriteStripItem[]
  } catch {
    return []
  }
}

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

/**
 * Client-side helper: returns whether the current user has favorited a restaurant.
 * Returns false for unauthenticated users or non-client roles.
 */
export async function getIsFavorite(restaurantId: number): Promise<boolean> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const { data: profile } = await supabase
      .from("profile")
      .select("id,role")
      .eq("user_id", user.id)
      .maybeSingle()
    if (!profile || profile.role !== "client") return false
    const { data } = await supabase
      .from("favorite")
      .select("profile_id")
      .eq("profile_id", profile.id)
      .eq("restaurant_id", restaurantId)
      .maybeSingle()
    return !!data
  } catch {
    return false
  }
}

export async function toggleFavorite(restaurantId: number): Promise<ToggleFavoriteResult> {
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
