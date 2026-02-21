import { createClient } from "@/lib/supabase/client"

export interface UploadResult {
  path: string
  fullPath: string
  publicUrl: string
}

export async function uploadToBucket(
  bucket: "restaurants" | "ads",
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

export function getPublicUrl(bucket: "restaurants" | "ads", path: string): string {
  const supabase = createClient()
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}
