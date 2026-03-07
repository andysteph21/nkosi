"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

export async function inviteAdminAction(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get("email")?.toString().trim() ?? ""
  const firstName = formData.get("firstName")?.toString().trim() ?? ""
  const lastName = formData.get("lastName")?.toString().trim() ?? ""
  if (!email || !firstName || !lastName) return { error: "Tous les champs sont requis." }

  const { data: exists } = await supabase.from("profile").select("id").eq("email", email).maybeSingle()
  if (exists) return { error: "Cet email existe deja." }

  const adminClient = createAdminClient()
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
  if (!baseUrl) {
    console.error("[inviteAdminAction] NEXT_PUBLIC_BASE_URL is not set")
    return { error: "Configuration manquante (BASE_URL)." }
  }
  const redirectTo = `${baseUrl}/auth/callback?redirect_to=/admin-setup`
  console.log("[inviteAdminAction] redirectTo:", redirectTo)
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
    return { error: "Invitation envoyee mais creation du profil admin echouee." }
  }
  revalidatePath("/admin")
  return { success: true }
}

export async function toggleAdminActiveAction(userId: string, isActive: boolean) {
  const supabase = await createClient()
  await supabase.from("profile").update({ is_active: isActive }).eq("user_id", userId)
  if (!isActive) {
    const adminClient = createAdminClient()
    await adminClient.auth.admin.signOut(userId)
  }
  revalidatePath("/admin")
}

export async function resendAdminInviteAction(userId: string) {
  const supabase = await createClient()
  const { data: adminProfile } = await supabase
    .from("profile")
    .select("email,invited_at,first_name,last_name")
    .eq("user_id", userId)
    .single()
  if (!adminProfile?.email) return { error: "Admin introuvable." }

  const lastInvite = adminProfile.invited_at ? new Date(adminProfile.invited_at).getTime() : 0
  if (Date.now() - lastInvite < 60_000) {
    return { error: "Attendez au moins 1 minute avant de renvoyer l'invitation." }
  }

  const adminClient = createAdminClient()
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
  if (!baseUrl) {
    console.error("[resendAdminInviteAction] NEXT_PUBLIC_BASE_URL is not set")
    return { error: "Configuration manquante (BASE_URL)." }
  }
  const redirectTo = `${baseUrl}/auth/callback?redirect_to=/admin-setup`
  console.log("[resendAdminInviteAction] redirectTo:", redirectTo)
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
