import { createClient } from "@/lib/supabase/client"

export interface Ad {
  id: number
  image: string
  alt: string
  link?: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}

function mapAdRow(row: any): Ad {
  return {
    id: row.id,
    image: row.media_url,
    alt: row.alt_text ?? "Publicite",
    link: row.link_url ?? undefined,
    active: row.is_active,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

export async function getAllAds(): Promise<Ad[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from("ad").select("*").order("sort_order", { ascending: true })
  if (error) throw error
  return (data ?? []).map(mapAdRow)
}

export async function getActiveAds(): Promise<Ad[]> {
  const supabase = createClient()
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from("ad")
    .select("*")
    .eq("is_active", true)
    .or(`end_date.is.null,end_date.gt.${now}`)
    .order("sort_order", { ascending: true })
    .limit(10)
  if (error) throw error
  return (data ?? []).map(mapAdRow)
}

export async function getAdById(id: number): Promise<Ad | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from("ad").select("*").eq("id", id).maybeSingle()
  if (error) throw error
  return data ? mapAdRow(data) : null
}

export async function createAd(image: string, alt: string, link?: string): Promise<Ad> {
  const supabase = createClient()
  const { count } = await supabase
    .from("ad")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true)
  const { data, error } = await supabase
    .from("ad")
    .insert({
      media_url: image,
      media_type: "image",
      alt_text: alt,
      link_url: link ?? null,
      is_active: (count ?? 0) < 10,
    })
    .select("*")
    .single()
  if (error) throw error
  return mapAdRow(data)
}

export async function updateAd(id: number, updates: Partial<Omit<Ad, "id" | "createdAt">>): Promise<Ad | null> {
  const supabase = createClient()
  const payload: Record<string, unknown> = {}
  if (typeof updates.image === "string") payload.media_url = updates.image
  if (typeof updates.alt === "string") payload.alt_text = updates.alt
  if (typeof updates.link === "string") payload.link_url = updates.link
  if (typeof updates.active === "boolean") payload.is_active = updates.active
  const { data, error } = await supabase.from("ad").update(payload).eq("id", id).select("*").maybeSingle()
  if (error) throw error
  return data ? mapAdRow(data) : null
}

export async function deactivateAd(id: number): Promise<boolean> {
  const ad = await updateAd(id, { active: false })
  return Boolean(ad)
}

export async function activateAd(id: number): Promise<boolean> {
  const supabase = createClient()
  const { count } = await supabase
    .from("ad")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true)
  if ((count ?? 0) >= 10) return false
  const ad = await updateAd(id, { active: true })
  return Boolean(ad)
}

export async function deleteAd(id: number): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from("ad").delete().eq("id", id)
  if (error) throw error
  return true
}
