import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { supabaseFetch } from "@/lib/supabase/fetch"

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      // Same timeout + retry behaviour as the browser client. Especially
      // useful at SSR time: a flaky DB call would otherwise stall the whole
      // page render until Node's HTTP default timeout.
      global: { fetch: supabaseFetch },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Called from a Server Component where cookie writes are ignored.
          }
        },
      },
    }
  )
}
