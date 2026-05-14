import { createBrowserClient } from "@supabase/ssr"
import { supabaseFetch } from "@/lib/supabase/fetch"

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      // Hard-timeout every PostgREST / Storage call and auto-retry transient
      // failures. Critical for the 2G/3G target audience.
      global: { fetch: supabaseFetch },
    },
  )
}
