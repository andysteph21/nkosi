import { createClient } from "@/lib/supabase/client"

export async function getPlatesByRestaurant(restaurantId: number) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("plate")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("id", { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function createPlate(payload: {
  restaurant_id: number
  category_id: number | null
  name: string
  price: number
  image: Record<string, unknown>
  video?: Record<string, unknown> | null
  is_visible?: boolean
}) {
  const supabase = createClient()
  const { data, error } = await supabase.from("plate").insert(payload).select("*").single()
  if (error) throw error
  return data
}

export async function updatePlate(id: number, payload: Record<string, unknown>) {
  const supabase = createClient()
  const { data, error } = await supabase.from("plate").update(payload).eq("id", id).select("*").single()
  if (error) throw error
  return data
}

export async function deletePlate(id: number) {
  const supabase = createClient()
  const { error } = await supabase.from("plate").delete().eq("id", id)
  if (error) throw error
}

export async function deleteCategorySafe(categoryId: number, restaurantId: number) {
  const supabase = createClient()
  const { data: uncategorized } = await supabase
    .from("category")
    .upsert(
      {
        restaurant_id: restaurantId,
        name: "Non categorise",
        sort_order: 999,
      },
      { onConflict: "name,restaurant_id" }
    )
    .select("id")
    .single()

  await supabase
    .from("plate")
    .update({ category_id: uncategorized?.id ?? null, is_visible: false })
    .eq("category_id", categoryId)
  await supabase.from("category").delete().eq("id", categoryId)
}
