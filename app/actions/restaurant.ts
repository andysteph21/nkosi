"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function createRestaurantAction(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/create-restaurant?error=Session%20invalide.")

  const { data: profile } = await supabase.from("profile").select("id").eq("user_id", user.id).single()
  if (!profile) redirect("/create-restaurant?error=Profil%20introuvable.")

  const payload = {
    profile_id: profile.id,
    name: formData.get("name")?.toString() ?? "",
    description: (formData.get("description")?.toString() ?? "").slice(0, 200),
    city: formData.get("city")?.toString() ?? "",
    neighborhood: formData.get("neighborhood")?.toString() ?? "",
    address: formData.get("address")?.toString() ?? "",
  }

  const { data, error } = await supabase.from("restaurant").insert(payload).select("id").single()
  if (error) redirect("/create-restaurant?error=Impossible%20de%20creer%20le%20restaurant.")

  revalidatePath("/my-restaurant")
  redirect(`/my-restaurant?success=Restaurant%20cree&id=${data.id}`)
}

export async function toggleRestaurantVisibilityAction(restaurantId: number, isVisible: boolean) {
  const supabase = await createClient()
  const { data: restaurant } = await supabase
    .from("restaurant")
    .select("is_restricted")
    .eq("id", restaurantId)
    .single()
  if (restaurant?.is_restricted) {
    return { error: "Restaurant encore restreint." }
  }
  await supabase.from("restaurant").update({ is_visible: isVisible }).eq("id", restaurantId)
  revalidatePath("/my-restaurant")
  revalidatePath("/")
  return { success: true }
}

export async function requestVisibilityAction(restaurantId: number) {
  const supabase = await createClient()
  const { error } = await supabase.from("visibility_request").insert({
    restaurant_id: restaurantId,
    status: "pending",
  })
  if (error) return { error: "Demande deja en cours ou impossible a creer." }
  revalidatePath("/my-restaurant")
  return { success: true }
}
