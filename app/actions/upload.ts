"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isNextInternalError } from "@/lib/next-errors"

const TAG = "[uploadFileAction]"

export type UploadActionResult = { publicUrl: string } | { error: string }

/**
 * Uploads a file to Supabase Storage on behalf of the signed-in user.
 *
 * Why a Server Action instead of a direct browser upload:
 * the project's storage-api does not validate the ES256 (asymmetric) user
 * JWTs that Auth issues, so a browser-side upload is treated as anonymous and
 * blocked by the Storage RLS policies. The service-role key IS validated
 * correctly by storage-api, so we perform the upload here, server-side.
 *
 * Security: the storage RLS policy required the first path segment to equal
 * the caller's profile id (or the caller to be an admin for the `__platform/`
 * prefix). We re-enforce exactly that rule here before using service-role.
 */
export async function uploadFileAction(formData: FormData): Promise<UploadActionResult> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: "Session invalide. Reconnectez-vous." }

    const { data: profile } = await supabase
      .from("profile")
      .select("id, role")
      .eq("user_id", user.id)
      .maybeSingle()
    if (!profile) return { error: "Profil introuvable." }

    const bucket = formData.get("bucket")?.toString() ?? ""
    const path = formData.get("path")?.toString() ?? ""
    const file = formData.get("file")
    if (bucket !== "restaurants" || !path || !(file instanceof File)) {
      return { error: "Paramètres d'upload invalides." }
    }

    // DIAGNOSTIC (temporary): confirm the size the Server Action received,
    // so we can compare it with the size logged client-side by uploadToBucket.
    console.log(
      TAG,
      "received file",
      JSON.stringify({ name: file.name, type: file.type, size: file.size }),
    )

    // Guard against blank / corrupted uploads. A real image is always well
    // above 1 KB; a sub-1 KB file means an earlier step (compression or
    // transfer) produced garbage. Persisting it would render as an empty
    // image, so reject it with a clear message instead.
    if (file.size < 1024) {
      console.error(TAG, "rejected suspiciously small file:", file.size, "bytes")
      return {
        error:
          "Le fichier image semble vide ou corrompu. Réessayez avec une autre image.",
      }
    }

    // Enforce the same ownership rule as the storage RLS policy:
    //   first path segment == caller's profile id,
    //   OR caller is an admin uploading under the `__platform/` prefix.
    const isAdmin = profile.role === "admin" || profile.role === "super_admin"
    const firstSegment = path.split("/")[0]
    const allowed =
      firstSegment === String(profile.id) ||
      (firstSegment === "__platform" && isAdmin)
    if (!allowed) {
      console.warn(
        TAG,
        "path ownership check failed",
        JSON.stringify({ profileId: profile.id, firstSegment }),
      )
      return { error: "Chemin non autorisé." }
    }

    const admin = createAdminClient()
    const { data, error } = await admin.storage.from(bucket).upload(path, file, {
      upsert: true,
      contentType: file.type,
    })
    if (error) {
      console.error(TAG, "storage upload failed:", error.message)
      return { error: "Échec de l'envoi du fichier. Réessayez." }
    }

    const { data: publicData } = admin.storage.from(bucket).getPublicUrl(data.path)
    return { publicUrl: publicData.publicUrl }
  } catch (err) {
    if (isNextInternalError(err)) throw err
    console.error(TAG, "unexpected error:", err)
    return { error: "Erreur inattendue lors de l'envoi du fichier." }
  }
}
