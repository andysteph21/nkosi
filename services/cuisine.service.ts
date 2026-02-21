import { createClient } from "@/lib/supabase/client"

export async function getCuisines() {
  const supabase = createClient()
  const { data, error } = await supabase.from("cuisine").select("*").order("name")
  if (error) throw error
  return data ?? []
}

export async function createCuisine(name: string) {
  const supabase = createClient()
  const { data, error } = await supabase.from("cuisine").insert({ name }).select("*").single()
  if (error) throw error
  return data
}

export async function renameCuisine(id: number, name: string) {
  const supabase = createClient()
  const { data, error } = await supabase.from("cuisine").update({ name }).eq("id", id).select("*").single()
  if (error) throw error
  return data
}

export async function deleteCuisine(id: number) {
  const supabase = createClient()
  const { error } = await supabase.from("cuisine").delete().eq("id", id)
  if (error) throw error
}
