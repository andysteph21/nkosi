"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createCuisineAction(name: string) {
  const supabase = await createClient()
  await supabase.from("cuisine").insert({ name })
  revalidatePath("/admin")
}

export async function renameCuisineAction(id: number, name: string) {
  const supabase = await createClient()
  await supabase.from("cuisine").update({ name }).eq("id", id)
  revalidatePath("/admin")
}

export async function deleteCuisineAction(id: number) {
  const supabase = await createClient()
  const { data: links } = await supabase
    .from("restaurant_cuisine")
    .select("restaurant_id,is_main")
    .eq("cuisine_id", id)

  await supabase.from("restaurant_cuisine").delete().eq("cuisine_id", id)

  for (const link of links ?? []) {
    if (link.is_main) {
      const { data: subRows } = await supabase
        .from("restaurant_cuisine")
        .select("cuisine_id")
        .eq("restaurant_id", link.restaurant_id)
        .order("created_at", { ascending: true })
        .limit(1)

      if (subRows?.[0]) {
        await supabase
          .from("restaurant_cuisine")
          .update({ is_main: true })
          .eq("restaurant_id", link.restaurant_id)
          .eq("cuisine_id", subRows[0].cuisine_id)
      } else {
        const { data: restaurant } = await supabase
          .from("restaurant")
          .select("profile_id")
          .eq("id", link.restaurant_id)
          .single()
        if (restaurant?.profile_id) {
          await supabase.from("notification").insert({
            profile_id: restaurant.profile_id,
            type: "cuisine_removed",
            title: "Cuisine supprimee",
            message:
              "One of your cuisines was removed by an admin. Please update your restaurant profile to remain visible in searches.",
          })
        }
      }
    }
  }

  await supabase.from("cuisine").delete().eq("id", id)
  revalidatePath("/admin")
}
