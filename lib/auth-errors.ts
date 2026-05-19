import {
  isAuthApiError,
  isAuthWeakPasswordError,
  type AuthError,
} from "@supabase/supabase-js"

/**
 * Map a Supabase Auth error to a user-friendly French message.
 *
 * Always uses `error.code` (and `reasons` for weak_password) rather than
 * string-matching `error.message` — per Supabase's official guidance, message
 * strings are not part of the API contract and may change without notice:
 *
 *   https://supabase.com/docs/guides/auth/debugging/error-codes
 *
 * Codes covered match what NKOSI's UX surfaces today (signup, signin, password
 * reset, MFA-less flow). Add new branches as we hit them in the wild rather
 * than upfront — keeps the helper short and the messages tailored.
 */
export function frenchAuthError(error: AuthError | null | undefined): string {
  if (!error) return "Une erreur est survenue. Réessayez."

  // Weak-password errors carry an extra `reasons` array (`pwned`, `characters`,
  // `length`, …). Surface the most actionable explanation we can.
  if (isAuthWeakPasswordError(error)) {
    const reasons = error.reasons ?? []
    if (reasons.includes("pwned")) {
      return "Ce mot de passe a été retrouvé dans une fuite de données connue. Choisissez-en un autre."
    }
    if (reasons.includes("length")) {
      return "Le mot de passe est trop court. Utilisez au moins 8 caractères."
    }
    if (reasons.includes("characters")) {
      return "Mot de passe trop simple. Mélangez majuscules, minuscules, chiffres et symboles."
    }
    return "Mot de passe trop faible. Choisissez-en un plus complexe."
  }

  if (isAuthApiError(error)) {
    switch (error.code) {
      case "email_exists":
      case "user_already_exists":
        return "Un compte existe déjà avec cette adresse email. Connectez-vous plutôt."

      case "invalid_credentials":
        return "Email ou mot de passe incorrect."

      case "email_not_confirmed":
        return "Votre email n'est pas encore confirmé. Vérifiez votre boîte mail."

      case "email_address_invalid":
        return "Cette adresse email n'est pas acceptée. Utilisez une vraie adresse."

      case "email_address_not_authorized":
        return "L'envoi d'email à cette adresse n'est pas autorisé sur ce projet."

      case "over_email_send_rate_limit":
        return "Trop d'emails envoyés à cette adresse. Patientez quelques minutes avant de réessayer."

      case "over_request_rate_limit":
        return "Trop de tentatives. Réessayez dans quelques minutes."

      case "over_sms_send_rate_limit":
        return "Trop de SMS envoyés. Patientez avant de réessayer."

      case "signup_disabled":
      case "email_provider_disabled":
        return "Les inscriptions sont actuellement fermées."

      case "same_password":
        return "Le nouveau mot de passe doit être différent de l'ancien."

      case "validation_failed":
        return "Données invalides. Vérifiez les informations saisies."

      case "reauthentication_needed":
        return "Veuillez vous reconnecter pour effectuer cette action."

      case "reauthentication_not_valid":
        return "Le code de vérification est incorrect."

      case "user_banned":
        return "Compte suspendu. Contactez un administrateur."

      case "user_not_found":
        return "Utilisateur introuvable."

      case "session_expired":
      case "session_not_found":
        return "Votre session a expiré. Reconnectez-vous."

      case "otp_expired":
        return "Le code de vérification a expiré. Recommencez."

      case "otp_disabled":
        return "Connexion par code à usage unique désactivée."

      case "captcha_failed":
        return "Vérification anti-robot échouée. Réessayez."

      case "phone_exists":
        return "Ce numéro de téléphone est déjà utilisé."

      case "invite_not_found":
        return "Invitation expirée ou déjà utilisée."

      case "no_authorization":
        return "Authentification requise."

      case "not_admin":
        return "Action réservée aux administrateurs."

      case "unexpected_failure":
        return "Le service d'authentification est temporairement indisponible. Réessayez dans un instant."

      default:
        // Last resort: include the raw message so the user has at least a
        // chance to act, but prefix it so we know it's an unmapped code we
        // should add to the switch above.
        return `Erreur : ${error.message}`
    }
  }

  // Non-API errors (network, abort, client state). The message is usually
  // English but at least surfaces something.
  return error.message || "Une erreur est survenue. Réessayez."
}
