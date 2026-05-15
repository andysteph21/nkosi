import { createClient } from "@/lib/supabase/server"
import type { Profile } from "@/lib/types"
import { isNextInternalError } from "@/lib/next-errors"

export default async function getProfile(): Promise<Profile | null> {
  try {
    const supabase = await createClient()
    const { data, error: authError } = await supabase.auth.getUser()
    if (authError || !data?.user) return null

    const { data: profile, error } = await supabase
      .from("profile")
      .select("*")
      .