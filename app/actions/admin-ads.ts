"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function setAdStatusAction(id: number, isActive: boolean, endDate?: string | null) {
  const supabase = await createClient()
  await supabase.from("ad").update({ is_active: isActive, end_date: endDate ?? null }).eq("id", id)
  revalidatePath("/admin")
}

export async function deleteAdAction(id: number) {
  const supabase = await createClient()
  await supabase.from("ad").delete().eq("id", id)
  revalidatePath("/admin")
}
