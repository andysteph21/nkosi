import { createClient } from "@/lib/supabase/client"

export async function getVisibilityRequests() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("visibility_request")
    .select("*,restaurant(id,name,city,neighborhood)")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function createVisibilityRequest(restaurantId: number) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("visibility_request")
    .insert({
      restaurant_id: restaurantId,
      status: "pending",
    })
    .select("*")
    .single()
  if (error) throw error
  return data
}

export async function approveVisibilityRequest(id: number) {
  const supabase = createClient()
  const { data: request } = await supabase
    .from("visibility_request")
    .select("restaurant_id")
    .eq("id", id)
    .single()

  await supabase.from("visibility_request").update({ status: "approved" }).eq("id", id)
  if (request?.restaurant_id) {
    await supabase
      .from("restaurant")
      .update({ is_restricted: false, is_visible: true })
      .eq("id", request.restaurant_id)
  }
}

export async function refuseVisibilityRequest(id: number, message: string) {
  const supabase = createClient()
  const { data: request } = await supabase
    .from("visibility_request")
    .select("restaurant_id,restaurant(profile_id)")
    .eq("id", id)
    .single()

  await supabase.from("visibility_request").update({ status: "refused", refusal_message: message }).eq("id", id)

  const profileId = (request as any)?.restaurant?.profile_id
  if (profileId) {
    await supabase.from("notification").insert({
      profile_id: profileId,
      type: "visibility_refused",
      title: "Demande de visibilite refusee",
      message,
      is_read: false,
    })
  }
}
