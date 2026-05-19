"use server"

import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth-guards"
import { revalidatePath } from "next/cache"

export async function setAdStatusAction(id: number, isActive: boolean, endDate?: string | null) {
  const guard = await requireAdmin()
  if (guard) return guard

  const supabase = await createClient()
  await supabase.from("ad").update({ is_active: isActive, end_date: endDate ?? null }).eq("id", id)
  revalidatePath("/admin")
}

export async function deleteAdAction(id: number) {
  const guard = await requireAdmin()
  if (guard) return guard

  const supabase = await createClient()
  await supabase.from("ad").delete().eq("id", id)
  revalidatePath("/admin")
}
