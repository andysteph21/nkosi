"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createPlateAction(input: {
  restaurantId: number
  name: string
  price: number
  imagePath: string
  categoryId?: number | null
}) {
  const supabase = await createClient()
  const { error } = await supabase.from("plate").insert({
    restaurant_id: input.restaurantId,
    category_id: input.categoryId ?? null,
    name: input.name,
    price: input.price,
    image: { path: input.imagePath },
    is_visible: true,
  })
  if (error) return { error: "Impossible d'ajouter le plat." }
  revalidatePath("/my-restaurant")
  return { success: true }
}

export async function updatePlateAction(input: {
  plateId: number
  name?: string
  price?: number
  isVisible?: boolean
}) {
  const supabase = await createClient()
  const payload: Record<string, unknown> = {}
  if (input.name !== undefined) payload.name = input.name
  if (input.price !== undefined) payload.price = input.price
  if (input.isVisible !== undefined) payload.is_visible = input.isVisible
  const { error } = await supabase.from("plate").update(payload).eq("id", input.plateId)
  if (error) return { error: "Impossible de modifier le plat." }
  revalidatePath("/my-restaurant")
  return { success: true }
}

export async function deletePlateAction(plateId: number) {
  const supabase = await createClient()
  const { error } = await supabase.from("plate").delete().eq("id", plateId)
  if (error) return { error: "Impossible de supprimer le plat." }
  revalidatePath("/my-restaurant")
  return { success: true }
}
