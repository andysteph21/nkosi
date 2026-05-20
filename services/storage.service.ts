import { createClient } from "@/lib/supabase/client"

/**
 * Single public bucket for every media asset (restaurants, plates, ads).
 *
 * Why one bucket: ad-blockers (uBlock Origin, AdBlock Plus, Brave Shield)
 * match any URL containing /ads/ via the universal ad-blocker filter rule, so
 * a dedicated `ads` bucket gets silently blocked for ~30 % of users. We keep
 * everything under `restaurants/` and segregate platform-managed content
 * under the special `__platform/` prefix.
 */
export type Bucket = "restaurants"

export interface UploadResult {
  path: string
  fullPath: string
  publicUrl: string
}

/**
 * Decode a JWT's header + payload without verifying the signature.
 * Browser-only diagnostic helper — used purely for logging, never for auth
 * decisions. Returns null if the token is malformed.
 */
function decodeJwt(token: string): { header: Record<string, unknown>; payload: Record<string, unknown> } | null {
  try {
    const [h, p] = token.split(".")
    const fromB64Url = (s: string) => {
      const norm = s.replace(/-/g, "+").replace(/_/g, "/")
      const padded = norm + "=".repeat((4 - (norm.length % 4)) % 4)
      return JSON.parse(atob(padded)) as Record<string, unknown>
    }
    return { header: fromB64Url(h), payload: fromB64Url(p) }
  } catch {
    return null
  }
}

export async function uploadToBucket(
  bucket: Bucket,
  path: string,
  file: File
): Promise<UploadResult> {
  const supabase = createClient()

  // --- DIAGNOSTIC LOGGING (temporary) ----------------------------------
  // Confirms exactly what the browser client sends to Storage. The theory
  // under test: Auth issues ES256 JWTs (asymmetric signing key) but the
  // project's storage-api only validates the legacy HS256 key, so it treats
  // the request as anonymous and RLS rejects the INSERT.
  //
  // What to look for in the console:
  //   - "outgoing JWT" present, alg=ES256, kid matches the dashboard
  //     Current Key, sub = the user's id, role=authenticated, not expired
  //   - "UPLOAD FAILED" with a 400 / RLS message
  // Together that proves the JWT is valid yet Storage rejects it.
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) {
    console.error(
      "[uploadToBucket] NO SESSION — browser client has no access_token;",
      "Storage will treat this as an anonymous request and RLS will reject it.",
    )
  } else {
    const decoded = decodeJwt(token)
    const header = decoded?.header ?? {}
    const payload = decoded?.payload ?? {}
    const nowSec = Math.floor(Date.now() / 1000)
    console.log(
      "[uploadToBucket] outgoing JWT",
      JSON.stringify({
        alg: header.alg ?? null,
        kid: header.kid ?? null,
        sub: payload.sub ?? null,
        role: payload.role ?? null,
        email: payload.email ?? null,
        aud: payload.aud ?? null,
        iss: payload.iss ?? null,
        exp: payload.exp ?? null,
        expiresInSec: typeof payload.exp === "number" ? payload.exp - nowSec : null,
        expired: typeof payload.exp === "number" ? payload.exp <= nowSec : null,
      }),
    )
  }
  console.log(
    "[uploadToBucket] uploading",
    JSON.stringify({ bucket, path, fileType: file.type, fileSizeBytes: file.size }),
  )
  // ---------------------------------------------------------------------

  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: file.type,
  })

  if (error) {
    // Dump every field Storage returned so the failure mode is unambiguous.
    const e = error as Record<string, unknown>
    console.error(
      "[uploadToBucket] UPLOAD FAILED",
      JSON.stringify({
        name: e.name ?? null,
        message: e.message ?? null,
        status: e.status ?? null,
        statusCode: e.statusCode ?? null,
        error: e.error ?? null,
      }),
    )
    throw error
  }

  console.log("[uploadToBucket] upload OK", data.path)
  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(data.path)
  return {
    path: data.path,
    fullPath: `${bucket}/${data.path}`,
    publicUrl: publicData.publicUrl,
  }
}

export function getPublicUrl(bucket: Bucket, path: string): string {
  const supabase = createClient()
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}
