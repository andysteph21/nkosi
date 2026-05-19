"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireSuperAdmin } from "@/lib/auth-guards"
import { getSiteOrigin } from "@/lib/site-url"
import { revalidatePath } from "next/cache"

export async function inviteAdminAction(formData: FormData) {
  const guard = await requireSuperAdmin()
  if (guard) return guard

  const supabase = await createClient()
  const email = formData.get("email")?.toString().trim() ?? ""
  const firstName = formData.get("firstName")?.toString().trim() ?? ""
  const lastName = formData.get("lastName")?.toString().trim() ?? ""
  if (!email || !firstName || !lastName) return { error: "Tous les champs sont requis." }

  const { data: exists } = await supabase.from("profile").select("id").eq("email", email).maybeSingle()
  if (exists) return { error: "Cet email existe déjà." }

  const adminClient = createAdminClient()
  const redirectTo = `${await getSiteOrigin()}/auth/callback?redirect_to=/admin-setup`
  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { first_name: firstName, last_name: lastName },
  })
  if (error || !data.user) {
    console.error("[inviteAdminAction] inviteUserByEmail error:", error)
    return { error: "Invitation impossible." }
  }

  const { error: profileError } = await adminClient.from("profile").insert({
    user_id: data.user.id,
    first_name: firstName,
    last_name: lastName,
    email,
    role: "admin",
    invited_at: new Date().toISOString(),
    must_change_password: true,
  })

  if (profileError) {
    console.error("[inviteAdminAction] profile insert error:", profileError)
    return { error: "Invitation envoyée mais création du profil administrateur échouée." }
  }
  revalidatePath("/admin")
  return { success: true }
}

export async function toggleAdminActiveAction(userId: string, isActive: boolean) {
  const guard = await requireSuperAdmin()
  if (guard) return guard

  const supabase = await createClient()
  await supabase.from("profile").update({ is_active: isActive }).eq("user_id", userId)
  if (!isActive) {
    const adminClient = createAdminClient()
    await adminClient.auth.admin.signOut(userId)
  }
  revalidatePath("/admin")
}

export async function resendAdminInviteAction(userId: string) {
  const guard = await requireSuperAdmin()
  if (guard) return guard

  const supabase = await createClient()
  const { data: adminProfile } = await supabase
    .from("profile")
    .select("email,invited_at,first_name,last_name")
    .eq("user_id", userId)
    .single()
  if (!adminProfile?.email) return { error: "Administrateur introuvable." }

  const lastInvite = adminProfile.invited_at ? new Date(adminProfile.invited_at).getTime() : 0
  if (Date.now() - lastInvite < 60_000) {
    return { error: "Attendez au moins 1 minute avant de renvoyer l'invitation." }
  }

  const adminClient = createAdminClient()
  const redirectTo = `${await getSiteOrigin()}/auth/callback?redirect_to=/admin-setup`
  const { error } = await adminClient.auth.admin.inviteUserByEmail(adminProfile.email, {
    redirectTo,
    data: { first_name: adminProfile.first_name, last_name: adminProfile.last_name },
  })
  if (error) {
    console.error("[resendAdminInviteAction] inviteUserByEmail error:", error)
    return { error: "Impossible de renvoyer l'invitation." }
  }

  await supabase.from("profile").update({ invited_at: new Date().toISOString() }).eq("user_id", userId)
  revalidatePath("/admin")
  return { success: true }
}
