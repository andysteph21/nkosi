import { createClient } from "@/lib/supabase/server"

export type GuardError = { error: string }

/**
 * Server-side role guards for server actions.
 *
 * Why these exist: Next.js Server Actions are callable by *any* authenticated
 * client — a layout-level role check only protects the rendered page, not the
 * action itself. For actions that mutate via the service-role admin client
 * (which bypasses RLS), we must re-check the caller's role here. For actions
 * that go through RLS, the policy already rejects unauthorised writes, but
 * an explicit guard gives a friendlier French error message instead of a
 * cryptic Postgres permission error.
 *
 * Each guard returns null on success or { error } on failure, so callers
 * can early-return without throwing.
 */

async function getCallerRole(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from("profile")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle()
  return profile?.role ?? null
}

/** Allow `admin` and `super_admin`. */
export async function requireAdmin(): Promise<GuardError | null> {
  const role = await getCallerRole()
  if (!role) return { error: "Authentification requise." }
  if (role !== "admin" && role !== "super_admin") {
    return { error: "Action réservée aux administrateurs." }
  }
  return null
}

/** Allow only `super_admin`. */
export async function requireSuperAdmin(): Promise<GuardError | null> {
  const role = await getCallerRole()
  if (!role) return { error: "Authentification requise." }
  if (role !== "super_admin") {
    return { error: "Action réservée au super administrateur." }
  }
  return null
}
