import { createClient } from "@supabase/supabase-js"

const TAG = "[bootstrap]"

export async function ensureSuperAdminBootstrapped() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRole) {
    console.warn(TAG, "Skipped: missing SUPABASE_URL or SERVICE_ROLE_KEY", { url: !!url, serviceRole: !!serviceRole })
    return
  }

  console.log(TAG, "Starting bootstrap check...", { url })

  const admin = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const email = process.env.SUPER_ADMIN_EMAIL
  const password = process.env.SUPER_ADMIN_PASSWORD
  const firstName = process.env.SUPER_ADMIN_FIRST_NAME ?? "Super"
  const lastName = process.env.SUPER_ADMIN_LAST_NAME ?? "Admin"

  if (!email || !password) {
    console.warn(TAG, "Skipped: missing SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD")
    return
  }

  console.log(TAG, "Looking for existing super_admin profile...")
  const { data: existingProfile, error: profileQueryError } = await admin
    .from("profile")
    .select("id,user_id,email")
    .eq("role", "super_admin")
    .limit(1)
    .maybeSingle()

  if (profileQueryError) {
    console.error(TAG, "Error querying profile table:", profileQueryError)
  }

  console.log(TAG, "Existing profile:", existingProfile)

  if (existingProfile?.user_id) {
    console.log(TAG, "Profile has user_id, verifying auth user exists:", existingProfile.user_id)
    const { data: linkedUser, error: linkedUserError } = await admin.auth.admin.getUserById(existingProfile.user_id)
    console.log(TAG, "getUserById result:", { found: !!linkedUser?.user, error: linkedUserError?.message })
    if (!linkedUserError && linkedUser?.user) {
      console.log(TAG, "Auth user already exists and is linked. Nothing to do.")
      return
    }
    console.log(TAG, "Auth user NOT found for user_id", existingProfile.user_id, "- will clean up and recreate.")

    // Delete the orphaned auth.users row (may exist at DB level without a valid identity)
    console.log(TAG, "Deleting orphaned auth user", existingProfile.user_id)
    await admin.auth.admin.deleteUser(existingProfile.user_id)

    // Delete the orphaned profile so createUser + fresh profile insert won't hit unique constraints
    console.log(TAG, "Deleting orphaned profile id", existingProfile.id)
    await admin.from("profile").delete().eq("id", existingProfile.id)
  }

  let superAdminUserId: string | null = null

  console.log(TAG, "Attempting to create auth user for", email)
  const { data: created, error: createdError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName },
  })

  console.log(TAG, "createUser result:", {
    userId: created?.user?.id ?? null,
    error: createdError?.message ?? null,
    code: (createdError as any)?.code ?? null,
    status: (createdError as any)?.status ?? null,
  })

  if (!createdError && created?.user) {
    superAdminUserId = created.user.id
    console.log(TAG, "Auth user created:", superAdminUserId)
  } else {
    console.log(TAG, "createUser failed, searching existing auth users...")
    const { data: usersPage, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    console.log(TAG, "listUsers:", { count: usersPage?.users?.length ?? 0, error: listError?.message })

    const existingAuthUser = usersPage?.users?.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    )
    if (existingAuthUser) {
      superAdminUserId = existingAuthUser.id
      console.log(TAG, "Found existing auth user:", superAdminUserId, "- updating password.")
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
    console.error(TAG, "FATAL: superAdminUserId is null after all attempts.")
    return
  }

  // Upsert the profile row (insert or update on user_id conflict)
  console.log(TAG, "Upserting super_admin profile for user_id", superAdminUserId)
  const { error: upsertError } = await admin.from("profile").upsert(
    {
      user_id: superAdminUserId,
      first_name: firstName,
      last_name: lastName,
      email,
      role: "super_admin",
      must_change_password: true,
      confirmed_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  )
  if (upsertError) console.error(TAG, "Profile upsert error:", upsertError)
  else console.log(TAG, "Profile upserted successfully.")

  console.log(TAG, "Bootstrap complete.")
}
