/**
 * Client-side upload helpers shared by the 4 form modals
 * (add-ad, add-dish, edit-dish, restaurant-info).
 *
 * Wraps services/storage.service + lib/utils/image-compression with the path
 * conventions enforced by the Storage RLS policies created in migration
 * 00006_storage_buckets:
 *
 *   restaurants/<profile_id>/<restaurant_id>/logo-<uuid>.<ext>
 *   restaurants/<profile_id>/<restaurant_id>/cover-<uuid>.<ext>
 *   restaurants/<profile_id>/<restaurant_id>/plates/<uuid>.<ext>
 *   ads/<uuid>.<ext>
 */

import { uploadToBucket } from "@/services/storage.service"
import { compressToWebP } from "@/lib/utils/image-compression"

function extFor(file: File): string {
  if (file.type === "image/webp") return "webp"
  if (file.type === "image/jpeg") return "jpg"
  if (file.type === "image/png") return "png"
  if (file.type === "image/gif") return "gif"
  if (file.type === "video/mp4") return "mp4"
  if (file.type === "video/quicktime") return "mov"
  const fromName = file.name.split(".").pop()?.toLowerCase()
  return fromName ?? "bin"
}

/** Convert a "data:<mime>;base64,..." string to a File (no network). */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!m) throw new Error("Invalid data URL")
  const mime = m[1]
  const binary = atob(m[2])
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new File([bytes], filename, { type: mime })
}

/**
 * Upload a restaurant logo or cover image, returning the public URL.
 * Image is auto-compressed to WebP (≤ 1 MB) before upload.
 */
export async function uploadRestaurantImage(
  profileId: number,
  restaurantId: number,
  kind: "logo" | "cover",
  file: File,
): Promise<string> {
  const webp = await compressToWebP(file, kind === "logo" ? 0.3 : 1)
  const path = `${profileId}/${restaurantId}/${kind}-${crypto.randomUUID()}.webp`
  const { publicUrl } = await uploadToBucket("restaurants", path, webp)
  return publicUrl
}

/**
 * Upload a plate image. Auto-compressed to WebP ≤ 0.5 MB.
 */
export async function uploadPlateImage(
  profileId: number,
  restaurantId: number,
  file: File,
): Promise<string> {
  const webp = await compressToWebP(file, 0.5)
  const path = `${profileId}/${restaurantId}/plates/${crypto.randomUUID()}.webp`
  const { publicUrl } = await uploadToBucket("restaurants", path, webp)
  return publicUrl
}

/**
 * Upload a plate video. No compression (caller already enforced duration ≤ 10 s
 * and size in the modal). MP4 only.
 */
export async function uploadPlateVideo(
  profileId: number,
  restaurantId: number,
  file: File,
): Promise<string> {
  const path = `${profileId}/${restaurantId}/plates/${crypto.randomUUID()}.${extFor(file)}`
  const { publicUrl } = await uploadToBucket("restaurants", path, file)
  return publicUrl
}

/**
 * Upload an ad image. Stored under the `restaurants` bucket at
 * `__platform/banners/<uuid>.webp` to dodge ad-blocker URL filters that
 * silently block any path containing `/ads/`. The Storage RLS policies for
 * `restaurants` already allow `is_admin_like()` users to write anywhere, so
 * the `__platform/` prefix is reserved for platform-managed content.
 */
export async function uploadAdImage(file: File): Promise<string> {
  const webp = await compressToWebP(file, 1)
  const path = `__platform/banners/${crypto.randomUUID()}.webp`
  const { publicUrl } = await uploadToBucket("restaurants", path, webp)
  return publicUrl
}
