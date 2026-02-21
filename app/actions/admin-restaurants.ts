"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function setRestaurantRestrictionAction(id: number, restricted: boolean) {
  const supabase = await createClient()
  await supabase
    .from("restaurant")
    .update({ is_restricted: restricted, is_visible: restricted ? false : true })
    .eq("id", id)
  revalidatePath("/admin")
}

export async function answerVisibilityRequestAction(
  id: number,
  decision: "approved" | "refused",
  refusalMessage?: string
) {
  const supabase = await createClient()
  const { data } = await supabase.from("visibility_request").select("restaurant_id").eq("id", id).single()
  if (!data) return

  if (decision === "approved") {
    await supabase.from("restaurant").update({ is_restricted: false, is_visible: true }).eq("id", data.restaurant_id)
    await supabase.from("visibility_request").delete().eq("id", id)
  } else {
    const { data: restaurant } = await supabase
      .from("restaurant")
      .select("profile_id")
      .eq("id", data?.restaurant_id)
      .single()
    await supabase
      .from("visibility_request")
      .update({ status: "refused", refusal_message: (refusalMessage ?? "").slice(0, 500) })
      .eq("id", id)
    if (restaurant?.profile_id) {
      await supabase.from("notification").insert({
        profile_id: restaurant.profile_id,
        type: "visibility_refused",
        title: "Demande refusee",
        message: (refusalMessage ?? "Votre demande a ete refusee.").slice(0, 500),
      })
    }
  }

  revalidatePath("/admin")
}
