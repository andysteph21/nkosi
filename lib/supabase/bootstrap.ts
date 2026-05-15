import { createClient } from "@supabase/supabase-js"
import { supabaseFetch } from "@/lib/supabase/fetch"
import { isNextInternalError } from "@/lib/next-errors"

const TAG = "[bootstrap]"

let bootstrapPromise: Promise<void> | null = null

export function ensureSuperAdminBootstrapped(): Promise<void> {
  if (!bootstrapPromise) {
    // Catch and log so a transient failure on first boot doesn't poison every
    // subsequent layout render with a rejected promise. The bootstrap is
    // best-effort; missing the super admin is recoverable on a later restart.
    // Re-throw Next.js sentinel errors (redirect/notFound/dynamic) untouched.
    bootstrapPromise = doBootstrap().catch((err) => {
      if (isNextInternalError(err)) {
        bootstrapPromise = null
        throw err
      }
      console.warn(TAG, "Bootstrap failed:", err)
      bootstrapPromise = null
    })
  }
  return bootstrapPromise
}

async function doBootstrap() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRole) {
    console.warn(TAG, "Skipped: missing SUPABASE_URL or SERVICE_ROLE_KEY")
    return
  }

  const admin = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: supabaseFetch },
  })

  const email = process.env.SUPER_ADMIN_EMAIL
  const password = process.env.SUPER_ADMIN_PASSWORD
  const firstName = process.env.SUPER_ADMIN_FIRST_NAME ?? "Super"
  const lastName = process.env.SUPER_ADMIN_LAST_NAME ?? "Admin"

  if (!email || !password) {
    console.warn(TAG, "Skipped: missing SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD")
    return
  }

  const { data: existingProfile, error: profileQueryError } = await admin
    .from("profile")
    .select("id,user_id,email")
    .eq("role", "super_admin")
    .limit(1)
    .maybeSingle()

  if (profileQueryError) {
    console.error(TAG, "Error querying profile table:", profileQueryError)
    return
  }

  if (existingProfile?.user_id) {
    const { data: linkedUser, error: linkedUserError } = await admin.auth.admin.getUserById(existingProfile.user_id)
    if (!linkedUserError && linkedUser?.user) {
      return
    }
    console.log(TAG, "Auth user NOT found for user_id", existingProfile.user_id, "- cleaning up and recreating.")

    await admin.auth.admin.deleteUser(existingProfile.user_id)
    await admin.from("profile").delete().eq("id", existingProfile.id)
  }

  let superAdminUserId: string | null = null

  console.log(TAG, "Creating auth user for", email)
  const { data: created, error: createdError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName },
  })

  if (!createdError && created?.user) {
    superAdminUserId = created.user.id
    console.log(TAG, "Auth user created:", superAdminUserId)
  } else {
    const { data: usersPage, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (listError) {
      console.error(TAG, "listUsers error:", listError.message)
      return
    }

    const existingAuthUser = usersPage?.users?.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    )
    if (existingAuthUser) {
      superAdminUserId = existingAuthUser.id
      const { error: updateError } = await admin.auth.admin.updateUserById(existingAuthUser.id, {
        password,
        email_confirm: true,
        user_metadata: { first_name: firstName, last_name: lastName },
      })
      if (updateError) console.error(TAG, "updateUserById error:", updateError)
    } else {
      console.error(TAG, "FATAL: Could not create or find auth user for", email)
      return
    }
  }

  if (!superAdminUserId) {
   