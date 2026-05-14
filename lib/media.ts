/**
 * Resolve a stored media reference to a renderable URL.
 *
 * The database currently mixes three eras of media storage:
 *   1. Legacy `data:image/...;base64,...` strings still present from before
 *      the Supabase Storage migration.
 *   2. New absolute Supabase Storage URLs:
 *      `https://<project>.supabase.co/storage/v1/object/public/<bucket>/<key>`
 *   3. Local static assets shipped from `public/` (e.g. `/placeholder.svg`).
 *
 * Some legacy code may also store a bare bucket key (`restaurants/2/cover.webp`).
 * We promote it to a full public URL using `NEXT_PUBLIC_SUPABASE_URL`.
 *
 * Always pass user-controlled media values through this helper before handing
 * them to <img> or next/image, so the dual-read transition (phase 1 of the
 * image-bucket migration) stays transparent in components.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const PUBLIC_PREFIX = SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public` : ""

export function resolveMediaUrl(value: string | null | undefined): string {
  if (!value) return "/placeholder.svg"
  // Absolute URL (Supabase Storage or any external CDN)
  if (value.startsWith("http://") || value.startsWith("https://")) return value
  // Legacy base64 data URL — render as-is
  if (value.startsWith("data:")) return value
  // Local in-memory blob URL (URL.createObjectURL) — used for live previews
  if (value.startsWith("blob:")) return value
  // Local static asset under public/
  if (value.startsWith("/")) return value
  // Otherwise treat as a bare bucket key, e.g. "restaurants/2/cover-xxx.webp"
  if (!PUBLIC_PREFIX) return value
  return `${PUBLIC_PREFIX}/${value}`
}

/**
 * True when the reference is a legacy base64 blob that still needs migration.
 * Useful for ops dashboards or one-off scripts.
 */
export function isLegacyBase64(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith("data:")
}
