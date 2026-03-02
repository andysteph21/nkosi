"use server"

import { redirect } from "next/navigation"
import { encodedRedirect } from "@/lib/auth-redirect"
import { createClient } from "@/lib/supabase/server"
import type { UserRole } from "@/lib/types"

export async function resendConfirmationAction(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get("email")?.toString().trim() ?? ""
  if (!email) {
    encodedRedirect("error", "/sign-in", "Email manquant.")
  }
  const { error } = await supabase.auth.resend({ type: "signup", email })
  if (error) {
    encodedRedirect("error", "/sign-in", "Impossible de renvoyer l'email de confirmation.")
  }
  redirect(`/check-email?email=${encodeURIComponent(email)}&resent=1`)
}

export async function updateProfileNamesAction(formData: FormData) {
  const supabase = await createClient()
  const firstName = formData.get("firstName")?.toString().trim() ?? ""
  const lastName = formData.get("lastName")?.toString().trim() ?? ""

  if (!firstName || !lastName) {
    encodedRedirect("error", "/profile", "Veuillez remplir tous les champs.")
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    encodedRedirect("error", "/profile", "Session invalide.")
  }

  const { error } = await supabase
    .from("profile")
    .update({ first_name: firstName, last_name: lastName })
    .eq("user_id", user!.id)

  if (error) {
    encodedRedirect("error", "/profile", "Impossible de mettre a jour le profil.")
  }

  encodedRedirect("success", "/profile", "Profil mis a jour.")
}

const PUBLIC_SIGNUP_ROLES: UserRole[] = ["client", "restaurateur"]

export async function signUpAction(formData: FormData) {
  const supabase = await createClient()
  const firstName = formData.get("firstName")?.toString().trim() ?? ""
  const lastName = formData.get("lastName")?.toString().trim() ?? ""
  const email = formData.get("email")?.toString().trim() ?? ""
  const password = formData.get("password")?.toString() ?? ""
  const confirmPassword = formData.get("confirmPassword")?.toString() ?? ""
  const role = (formData.get("role")?.toString() ?? "client") as UserRole
  const redirectTo = formData.get("redirectTo")?.toString() ?? "/"
  const autoLike = formData.get("autoLike")?.toString() ?? ""

  if (!firstName || !lastName || !email || !password) {
    encodedRedirect("error", "/sign-up", "Veuillez remplir tous les champs requis.")
  }

  if (password !== confirmPassword) {
    encodedRedirect("error", "/sign-up", "Les mots de passe ne correspondent pas.")
  }

  if (!PUBLIC_SIGNUP_ROLES.includes(role)) {
    encodedRedirect("error", "/sign-up", "Type de compte invalide.")
  }

  const { data: existing } = await supabase
    .from("profile")
    .select("id")
    .eq("email", email)
    .maybeSingle()

  if (existing) {
    encodedRedirect("error", "/sign-up", "Cette adresse email est deja utilisee.")
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback?redirect_to=${encodeURIComponent(redirectTo)}`,
      data: {
        first_name: firstName,
        last_name: lastName,
        auto_like: autoLike,
      },
    },
  })

  if (error || !data.user) {
    encodedRedirect("error", "/sign-up", "Erreur lors de la creation du compte.")
  }
  const createdUser = data.user!

  // Use service-role client to bypass RLS: the user's session isn't active yet
  // while email confirmation is pending, so auth.uid() returns NULL and the
  // profile_insert_self RLS policy would block a regular client insert.
  const { createClient: createServiceClient } = await import("@supabase/supabase-js")
  const adminClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  const { error: profileError } = await adminClient.from("profile").insert({
    user_id: createdUser.id,
    first_name: firstName,
    last_name: lastName,
    email,
    role,
    must_change_password: false,
  })

  if (profileError) {
    encodedRedirect("error", "/sign-up", "Impossible de creer le profil utilisateur.")
  }

  redirect(`/check-email?email=${encodeURIComponent(email)}`)
}

export async function signInAction(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get("email")?.toString() ?? ""
  const password = formData.get("password")?.toString() ?? ""

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    if (error.message === "Email not confirmed") {
      redirect(`/sign-in?unconfirmed=${encodeURIComponent(email)}`)
    }
    encodedRedirect("error", "/sign-in", "Email ou mot de passe invalide.")
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from("profile")
      .select("is_active")
      .eq("user_id", user.id)
      .single()

    if (profile && !profile.is_active) {
      await supabase.auth.signOut()
      encodedRedirect("error", "/sign-in", "Compte desactive. Contactez un administrateur.")
    }
  }

  redirect("/")
}

export async function forgotPasswordAction(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get("email")?.toString() ?? ""
  if (!email) {
    encodedRedirect("error", "/forgot-password", "Veuillez saisir votre email.")
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback?redirect_to=/reset-password`,
  })

  if (error) {
    encodedRedirect("error", "/forgot-password", "Impossible d'envoyer l'email de reinitialisation.")
  }

  encodedRedirect("success", "/forgot-password", "Email envoye. Verifiez votre boite mail.")
}

export async function resetPasswordAction(formData: FormData) {
  const supabase = await createClient()
  const password = formData.get("password")?.toString() ?? ""
  const confirmPassword = formData.get("confirmPassword")?.toString() ?? ""

  if (!password || password !== confirmPassword) {
    encodedRedirect("error", "/reset-password", "Les mots de passe ne correspondent pas.")
  }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    encodedRedirect("error", "/reset-password", "Impossible de mettre a jour le mot de passe.")
  }

  encodedRedirect("success", "/reset-password", "Mot de passe mis a jour.")
}

export async function changePasswordAction(formData: FormData) {
  const supabase = await createClient()
  const currentPassword = formData.get("currentPassword")?.toString() ?? ""
  const newPassword = formData.get("newPassword")?.toString() ?? ""
  const confirmPassword = formData.get("confirmPassword")?.toString() ?? ""

  if (!currentPassword || !newPassword) {
    encodedRedirect("error", "/profile", "Tous les champs sont requis.")
  }
  if (newPassword !== confirmPassword) {
    encodedRedirect("error", "/profile", "Les mots de passe ne correspondent pas.")
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    encodedRedirect("error", "/profile", "Session invalide.")
  }
  const userEmail = user!.email!
  const userId = user!.id

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: userEmail,
    password: currentPassword,
  })

  if (signInError) {
    encodedRedirect("error", "/profile", "Mot de passe actuel incorrect.")
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) {
    encodedRedirect("error", "/profile", "Impossible de changer le mot de passe.")
  }

  const { error: profileErr } = await supabase
    .from("profile")
    .update({ must_change_password: false })
    .eq("user_id", userId)

  if (profileErr) {
    encodedRedirect("error", "/profile", "Mot de passe modifie mais mise a jour du profil echouee.")
  }

  encodedRedirect("success", "/profile", "Mot de passe mis a jour.")
}

export async function markInitialPasswordChangedAction(formData: FormData) {
  const TAG = "[markInitialPasswordChanged]"
  const supabase = await createClient()
  const newPassword = formData.get("newPassword")?.toString() ?? ""
  const confirmPassword = formData.get("confirmPassword")?.toString() ?? ""

  console.log(TAG, "Called, passwords match:", newPassword === confirmPassword, "length:", newPassword.length)

  if (!newPassword || newPassword !== confirmPassword) {
    return { error: "Les mots de passe ne correspondent pas." }
  }

  const {
    data: { user },
    error: getUserError,
  } = await supabase.auth.getUser()
  console.log(TAG, "getUser:", { userId: user?.id ?? null, error: getUserError?.message ?? null })
  if (!user) return { error: "Session invalide." }

  const { data: updateData, error } = await supabase.auth.updateUser({ password: newPassword })
  console.log(TAG, "updateUser:", { userId: updateData?.user?.id ?? null, error: error?.message ?? null })
  if (error) return { error: "Impossible de mettre a jour le mot de passe." }

  // Use service-role client for the profile update because updateUser above
  // rotates session tokens, making the original session's auth.uid() return NULL
  // inside RLS policies -- causing a silent 0-row update.
  const { createClient: createServiceClient } = await import("@supabase/supabase-js")
  const adminClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  const { data: profileData, error: profileError } = await adminClient
    .from("profile")
    .update({ must_change_password: false })
    .eq("user_id", user.id)
    .select("id, must_change_password")

  console.log(TAG, "profile update:", { data: profileData, error: profileError?.message ?? null })

  if (profileError) {
    return { error: "Mot de passe modifie mais le profil n'a pas ete mis a jour." }
  }

  console.log(TAG, "Done — success")
  return { success: true }
}

export async function firstSetupAction(formData: FormData) {
  const supabase = await createClient()
  const firstName = formData.get("firstName")?.toString().trim() ?? ""
  const lastName = formData.get("lastName")?.toString().trim() ?? ""
  const email = formData.get("email")?.toString().trim() ?? ""
  const newPassword = formData.get("newPassword")?.toString() ?? ""
  const confirmPassword = formData.get("confirmPassword")?.toString() ?? ""

  if (!firstName || !lastName) {
    encodedRedirect("error", "/first-setup", "Le prénom et le nom sont requis.")
  }

  if (!newPassword) {
    encodedRedirect("error", "/first-setup", "Le mot de passe est requis.")
  }

  if (newPassword !== confirmPassword) {
    encodedRedirect("error", "/first-setup", "Les mots de passe ne correspondent pas.")
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    encodedRedirect("error", "/first-setup", "Session invalide.")
  }

  const updatePayload: { password: string; email?: string } = { password: newPassword }
  if (email && email !== user!.email) {
    updatePayload.email = email
  }

  const { error: authError } = await supabase.auth.updateUser(updatePayload)
  if (authError) {
    encodedRedirect("error", "/first-setup", "Impossible de mettre à jour les informations.")
  }

  const { createClient: createServiceClient } = await import("@supabase/supabase-js")
  const adminClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  await adminClient
    .from("profile")
    .update({
      first_name: firstName,
      last_name: lastName,
      ...(email && email !== user!.email ? { email } : {}),
      must_change_password: false,
    })
    .eq("user_id", user!.id)

  if (email && email !== user!.email) {
    encodedRedirect(
      "success",
      "/",
      "Compte configuré. Un email de vérification a été envoyé à votre nouvelle adresse."
    )
  }

  redirect("/")
}

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/")
}

export async function deleteAccountAction() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    encodedRedirect("error", "/profile", "Session invalide.")
  }

  const { data: profile } = await supabase.from("profile").select("id").eq("user_id", user!.id).single()
  if (profile) {
    await supabase.from("notification").delete().eq("profile_id", profile.id)
    const { data: restaurant } = await supabase.from("restaurant").select("id").eq("profile_id", profile.id).maybeSingle()
    if (restaurant) {
      await supabase.from("plate").delete().eq("restaurant_id", restaurant.id)
      await supabase.from("category").delete().eq("restaurant_id", restaurant.id)
      await supabase.from("restaurant_schedule").delete().eq("restaurant_id", restaurant.id)
      await supabase.from("restaurant_cuisine").delete().eq("restaurant_id", restaurant.id)
      await supabase.from("visibility_request").delete().eq("restaurant_id", restaurant.id)
      await supabase.from("favorite").delete().eq("restaurant_id", restaurant.id)
      await supabase.from("restaurant").delete().eq("id", restaurant.id)
    }
    await supabase.from("favorite").delete().eq("profile_id", profile.id)
    await supabase.from("profile").delete().eq("id", profile.id)
  }

  await supabase.auth.admin.deleteUser(user!.id)
  await supabase.auth.signOut()
  redirect("/")
}
