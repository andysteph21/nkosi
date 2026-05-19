"use server"

import { redirect } from "next/navigation"
import { isAuthApiError } from "@supabase/supabase-js"
import { encodedRedirect } from "@/lib/auth-redirect"
import { frenchAuthError } from "@/lib/auth-errors"
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
    console.error("[resendConfirmationAction]", error)
    encodedRedirect("error", "/sign-in", frenchAuthError(error))
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
    encodedRedirect("error", "/profile", "Session invalide. Reconnectez-vous.")
  }

  const { error } = await supabase
    .from("profile")
    .update({ first_name: firstName, last_name: lastName })
    .eq("user_id", user!.id)

  if (error) {
    console.error("[updateProfileNamesAction]", error)
    encodedRedirect("error", "/profile", "Impossible de mettre à jour le profil.")
  }

  encodedRedirect("success", "/profile", "Profil mis à jour.")
}

const PUBLIC_SIGNUP_ROLES: UserRole[] = ["client", "restaurateur"]

/** Re-render /sign-up with the staged user input preserved, so the visitor
 *  doesn't have to retype their name and email after a validation error. */
function signUpErrorRedirect(opts: {
  error: string
  firstName: string
  lastName: string
  email: string
  role: UserRole
  redirectTo?: string
  autoLike?: string
}): never {
  const params = new URLSearchParams()
  params.set("error", opts.error)
  params.set("role", opts.role)
  if (opts.firstName) params.set("firstName", opts.firstName)
  if (opts.lastName) params.set("lastName", opts.lastName)
  if (opts.email) params.set("email", opts.email)
  if (opts.redirectTo) params.set("redirect", opts.redirectTo)
  if (opts.autoLike) params.set("auto_like", opts.autoLike)
  redirect(`/sign-up?${params.toString()}`)
}

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

  const fail = (message: string) =>
    signUpErrorRedirect({
      error: message,
      firstName,
      lastName,
      email,
      role,
      redirectTo,
      autoLike,
    })

  if (!firstName || !lastName || !email || !password) {
    fail("Veuillez remplir tous les champs requis.")
  }

  if (password !== confirmPassword) {
    fail("Les mots de passe ne correspondent pas.")
  }

  if (!PUBLIC_SIGNUP_ROLES.includes(role)) {
    fail("Type de compte invalide.")
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
    console.error("[signUpAction] auth.signUp error:", error)
    fail(frenchAuthError(error))
  }
  const createdUser = data.user!

  // Use service-role client to bypass RLS: the user's session isn't active yet
  // while email confirmation is pending, so auth.uid() returns NULL and the
  // profile_insert_self RLS policy would block a regular client insert.
  const { createAdminClient } = await import("@/lib/supabase/admin")
  const adminClient = createAdminClient()

  const { error: profileError } = await adminClient.from("profile").insert({
    user_id: createdUser.id,
    first_name: firstName,
    last_name: lastName,
    email,
    role,
    must_change_password: false,
  })

  if (profileError) {
    console.error("[signUpAction] profile insert error:", profileError)
    // The auth.users row exists but has no profile attached: that would block
    // any future sign-up with the same email (the next attempt would see
    // `email_exists`). Roll the auth user back so the visitor can retry
    // cleanly.
    try {
      await adminClient.auth.admin.deleteUser(createdUser.id)
    } catch (cleanupErr) {
      console.error(
        "[signUpAction] FATAL: profile insert failed AND auth user cleanup failed; orphan auth.users row left for",
        createdUser.id,
        cleanupErr,
      )
    }
    fail("Compte non créé : impossible de sauvegarder le profil. Réessayez.")
  }

  redirect(`/check-email?email=${encodeURIComponent(email)}`)
}

export async function signInAction(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get("email")?.toString() ?? ""
  const password = formData.get("password")?.toString() ?? ""

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    // Special-case unconfirmed emails: route to the dedicated "renvoyer le mail"
    // screen rather than the generic error banner.
    if (isAuthApiError(error) && error.code === "email_not_confirmed") {
      redirect(`/sign-in?unconfirmed=${encodeURIComponent(email)}`)
    }
    console.error("[signInAction]", error)
    encodedRedirect("error", "/sign-in", frenchAuthError(error))
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from("profile")
      .select("is_active")
      .eq("user_id", user.id)
      .maybeSingle()

    if (profile && !profile.is_active) {
      await supabase.auth.signOut()
      encodedRedirect("error", "/sign-in", "Compte désactivé. Contactez un administrateur.")
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
    console.error("[forgotPasswordAction]", error)
    encodedRedirect("error", "/forgot-password", frenchAuthError(error))
  }

  encodedRedirect("success", "/forgot-password", "Email envoyé. Vérifiez votre boîte mail.")
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
    console.error("[resetPasswordAction]", error)
    encodedRedirect("error", "/reset-password", frenchAuthError(error))
  }

  encodedRedirect("success", "/reset-password", "Mot de passe mis à jour.")
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
    encodedRedirect("error", "/profile", "Session invalide. Reconnectez-vous.")
  }
  const userEmail = user!.email!
  const userId = user!.id

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: userEmail,
    password: currentPassword,
  })

  if (signInError) {
    console.error("[changePasswordAction] re-auth error:", signInError)
    encodedRedirect("error", "/profile", "Mot de passe actuel incorrect.")
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) {
    console.error("[changePasswordAction] updateUser error:", error)
    encodedRedirect("error", "/profile", frenchAuthError(error))
  }

  const { error: profileErr } = await supabase
    .from("profile")
    .update({ must_change_password: false })
    .eq("user_id", userId)

  if (profileErr) {
    console.error("[changePasswordAction] profile update error:", profileErr)
    encodedRedirect("error", "/profile", "Mot de passe modifié mais mise à jour du profil échouée.")
  }

  encodedRedirect("success", "/profile", "Mot de passe mis à jour.")
}

export async function firstSetupAction(formData: FormData): Promise<{ error?: string; success?: string }> {
  const supabase = await createClient()
  const firstName = formData.get("firstName")?.toString().trim() ?? ""
  const lastName = formData.get("lastName")?.toString().trim() ?? ""
  const email = formData.get("email")?.toString().trim() ?? ""
  const newPassword = formData.get("newPassword")?.toString() ?? ""
  const confirmPassword = formData.get("confirmPassword")?.toString() ?? ""

  if (!firstName || !lastName) {
    return { error: "Le prénom et le nom sont requis." }
  }
  if (!email) {
    return { error: "L'adresse email est requise." }
  }
  if (!newPassword) {
    return { error: "Le mot de passe est requis." }
  }
  if (newPassword !== confirmPassword) {
    return { error: "Les mots de passe ne correspondent pas." }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Session invalide. Reconnectez-vous." }
  }

  if (email.toLowerCase() === user.email?.toLowerCase()) {
    return { error: "Vous devez utiliser une adresse email différente de l'adresse actuelle." }
  }

  const { error: authError } = await supabase.auth.updateUser({
    password: newPassword,
    email,
  })
  if (authError) {
    console.error("[firstSetupAction] updateUser error:", authError)
    return { error: frenchAuthError(authError) }
  }

  const { createAdminClient } = await import("@/lib/supabase/admin")
  const adminClient = createAdminClient()

  const { error: profileError } = await adminClient
    .from("profile")
    .update({
      first_name: firstName,
      last_name: lastName,
      email,
      must_change_password: false,
    })
    .eq("user_id", user.id)

  if (profileError) {
    console.error("[firstSetupAction] profile update error:", profileError)
    return { error: "Informations mises à jour mais le profil n'a pas pu être sauvegardé." }
  }

  return { success: "Compte configuré. Un email de vérification a été envoyé à votre nouvelle adresse." }
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
    encodedRedirect("error", "/profile", "Session invalide. Reconnectez-vous.")
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

  const { createAdminClient } = await import("@/lib/supabase/admin")
  const adminClient = createAdminClient()
  await adminClient.auth.admin.deleteUser(user!.id)
  await supabase.auth.signOut()
  redirect("/")
}
