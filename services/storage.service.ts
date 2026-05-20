import { createClient } from "@/lib/supabase/client"
import { uploadFileAction } from "@/app/actions/upload"

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
 * Uploads a file to Storage.
 *
 * The upload is routed through a Server Action (`uploadFileAction`) which
 * performs it with the service-role key — the project's storage-api rejects
 * the ES256 user JWTs, so a direct browser upload is blocked by RLS.
 */
export async function uploadToBucket(
  bucket: Bucket,
  path: string,
  file: File
): Promise<UploadResult> {
  // DIAGNOSTIC (temporary): log the file size leaving the browser so we can
  // compare it with the size the Server Action receives.
  console.log(
    "[uploadToBucket] sending",
    JSON.stringify({ path, fileType: file.type, fileSizeBytes: file.size }),
  )

  const fd = new FormData()
  fd.set("bucket", bucket)
  fd.set("path", path)
  fd.set("file", file)

  const result = await uploadFileAction(fd)
  if ("error" in result) {
    throw new Error(result.error)
  }

  return {
    path,
    fullPath: `${bucket}/${path}`,
    publicUrl: result.publicUrl,
  }
}

export function getPublicUrl(bucket: Bucket, path: string): string {
  const supabase = createClient()
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}
