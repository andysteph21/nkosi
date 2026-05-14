import { createClient } from "@/lib/supabase/client"

/**
 * Single public bucket for every media asset (restaurants, plates, ads).
 *
 * Why one bucket: ad-blockers (uBlock Origin, AdBlock Plus, Brave Shield)
 * match any URL containing `/ads/` via the universal `||*/ads/*` filter, so
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

export async function uploadToBucket(
  bucket: Bucket,
  path: string,
  file: File
): Promise<UploadResult> {
  const supabase = createClient()
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: file.type,
  })
  if (error) throw error
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
