import { createClient } from "@supabase/supabase-js"

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      "[createAdminClient] Missing environment variables: " +
        (!url ? "NEXT_PUBLIC_SUPABASE_URL " : "") +
        (!serviceRoleKey ? "SUPABASE_SERVICE_ROLE_KEY" : "")
    )
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
