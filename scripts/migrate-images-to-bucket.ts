/* eslint-disable no-console */
/**
 * scripts/migrate-images-to-bucket.ts
 *
 * One-shot backfill: convert every legacy `data:` base64 blob stored in
 * `restaurant.logo`, `restaurant.cover`, `plate.image`, `plate.video` and
 * `ad.media_url` into a real Supabase Storage object, then update the DB row
 * to point at the new public URL.
 *
 * Idempotent: rows that already hold an https URL are skipped, so the script
 * can be re-run safely (e.g. after a partial failure).
 *
 * Required env vars (also accepted via .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL       — https://zahdtdzgoxkcglgsosgi.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY      — service_role key (bypasses RLS for backfill)
 *
 * Usage:
 *   pnpm dlx tsx scripts/migrate-images-to-bucket.ts                 # full migration
 *   pnpm dlx tsx scripts/migrate-images-to-bucket.ts --dry-run        # plan only
 *   pnpm dlx tsx scripts/migrate-images-to-bucket.ts --only=plates    # restaurants|plates|ads
 *
 * Path convention (so storage RLS can verify ownership):
 *   restaurants/<profile_id>/<restaurant_id>/logo-<uuid>.<ext>
 *   restaurants/<profile_id>/<restaurant_id>/cover-<uuid>.<ext>
 *   restaurants/<profile_id>/<restaurant_id>/plates/<plate_id>-<uuid>.<ext>
 *   ads/<uuid>.<ext>
 */

import { createClient } from "@supabase/supabase-js"
import { randomUUID } from "node:crypto"
import { writeFileSync, appendFileSync } from "node:fs"

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
  )
  process.exit(1)
}

const argv = new Set(process.argv.slice(2))
const DRY_RUN = argv.has("--dry-run")
const ONLY = (() => {
  const flag = process.argv.find((a) => a.startsWith("--only="))
  if (!flag) return null
  return flag.slice("--only=".length) as "restaurants" | "plates" | "ads"
})()

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const LOG_PATH = `migrate-images-${new Date().toISOString().replace(/[:.]/g, "-")}.log`
writeFileSync(LOG_PATH, `# Migration log @ ${new Date().toISOString()}\n`)

function log(line: string) {
  const stamped = `[${new Date().toISOString()}] ${line}`
  console.log(stamped)
  appendFileSync(LOG_PATH, stamped + "\n")
}

// -----------------------------------------------------------------------------
// Counters
// -----------------------------------------------------------------------------

const stats = {
  scanned: 0,
  uploaded: 0,
  skipped: 0,
  failed: 0,
  bytesUploaded: 0,
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

interface Decoded {
  buffer: Buffer
  mime: string
  ext: string
}

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
}

function decodeDataUrl(value: string | null | undefined): Decoded | null {
  if (typeof value !== "string") return null
  if (!value.startsWith("data:")) return null
  const m = value.match(/^data:([^;]+);base64,(.+)$/)
  if (!m) return null
  const mime = m[1].toLowerCase()
  const ext = MIME_TO_EXT[mime] ?? mime.split("/")[1] ?? "bin"
  return { buffer: Buffer.from(m[2], "base64"), mime, ext }
}

function isLegacy(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith("data:")
}

function pathLegacy(value: any): boolean {
  // jsonb columns store { path: "data:..." }
  if (!value) return false
  if (typeof value === "string") return isLegacy(value)
  if (typeof value === "object" && value !== null && "path" in value) {
    return isLegacy(value.path)
  }
  return false
}

function legacyPath(value: any): string | null {
  if (!value) return null
  if (typeof value === "string") return isLegacy(value) ? value : null
  if (typeof value === "object" && "path" in value && isLegacy(value.path)) {
    return value.path
  }
  return null
}

async function uploadDecoded(
  bucket: "restaurants" | "ads",
  storagePath: string,
  decoded: Decoded,
): Promise<string> {
  // Count bytes even in dry-run, so the summary reflects what *would* be moved.
  stats.bytesUploaded += decoded.buffer.byteLength
  if (DRY_RUN) {
    log(`[dry-run] would upload ${decoded.buffer.byteLength}B to ${bucket}/${storagePath}`)
    return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${storagePath}`
  }
  const { error } = await supabase.storage.from(bucket).upload(storagePath, decoded.buffer, {
    contentType: decoded.mime,
    upsert: false,
  })
  if (error) throw error
  const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath)
  return data.publicUrl
}

// -----------------------------------------------------------------------------
// Migrators
// -----------------------------------------------------------------------------

async function migrateRestaurants() {
  log("=== Restaurants: logo + cover ===")
  const { data, error } = await supabase
    .from("restaurant")
    .select("id, profile_id, logo, cover")
  if (error) throw error

  for (const r of data ?? []) {
    stats.scanned++

    const updates: Record<string, any> = {}

    const logoData = legacyPath(r.logo)
    if (logoData) {
      const decoded = decodeDataUrl(logoData)
      if (!decoded) {
        log(`  restaurant#${r.id} logo: cannot decode, skipping`)
      } else {
        const path = `${r.profile_id}/${r.id}/logo-${randomUUID()}.${decoded.ext}`
        try {
          const url = await uploadDecoded("restaurants", path, decoded)
          updates.logo = { path: url }
          log(`  restaurant#${r.id} logo  -> ${path} (${decoded.buffer.byteLength}B)`)
        } catch (e) {
          stats.failed++
          log(`  restaurant#${r.id} logo  FAILED: ${(e as Error).message}`)
        }
      }
    }

    const coverData = legacyPath(r.cover)
    if (coverData) {
      const decoded = decodeDataUrl(coverData)
      if (!decoded) {
        log(`  restaurant#${r.id} cover: cannot decode, skipping`)
      } else {
        const path = `${r.profile_id}/${r.id}/cover-${randomUUID()}.${decoded.ext}`
        try {
          const url = await uploadDecoded("restaurants", path, decoded)
          updates.cover = { path: url }
          log(`  restaurant#${r.id} cover -> ${path} (${decoded.buffer.byteLength}B)`)
        } catch (e) {
          stats.failed++
          log(`  restaurant#${r.id} cover FAILED: ${(e as Error).message}`)
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      stats.skipped++
      continue
    }
    stats.uploaded += Object.keys(updates).length
    if (DRY_RUN) continue
    const { error: upErr } = await supabase
      .from("restaurant")
      .update(updates)
      .eq("id", r.id)
    if (upErr) {
      stats.failed++
      log(`  restaurant#${r.id} DB update FAILED: ${upErr.message}`)
    }
  }
}

async function migratePlates() {
  log("=== Plates: image + video ===")

  // Need profile_id (from restaurant) for the storage path
  const { data, error } = await supabase
    .from("plate")
    .select("id, restaurant_id, image, video, restaurant:restaurant_id(profile_id)")
  if (error) throw error

  for (const p of data ?? []) {
    stats.scanned++
    const profileId = (p as any).restaurant?.profile_id
    if (!profileId) {
      log(`  plate#${p.id}: orphan (no restaurant.profile_id), skipping`)
      continue
    }

    const updates: Record<string, any> = {}

    const imgData = legacyPath(p.image)
    if (imgData) {
      const decoded = decodeDataUrl(imgData)
      if (!decoded) {
        log(`  plate#${p.id} image: cannot decode, skipping`)
      } else {
        const path = `${profileId}/${p.restaurant_id}/plates/${p.id}-${randomUUID()}.${decoded.ext}`
        try {
          const url = await uploadDecoded("restaurants", path, decoded)
          updates.image = { path: url }
          log(`  plate#${p.id} image -> ${path} (${decoded.buffer.byteLength}B)`)
        } catch (e) {
          stats.failed++
          log(`  plate#${p.id} image FAILED: ${(e as Error).message}`)
        }
      }
    }

    const vidData = legacyPath(p.video)
    if (vidData) {
      const decoded = decodeDataUrl(vidData)
      if (!decoded) {
        log(`  plate#${p.id} video: cannot decode, skipping`)
      } else {
        const path = `${profileId}/${p.restaurant_id}/plates/${p.id}-${randomUUID()}.${decoded.ext}`
        try {
          const url = await uploadDecoded("restaurants", path, decoded)
          updates.video = { path: url }
          log(`  plate#${p.id} video -> ${path} (${decoded.buffer.byteLength}B)`)
        } catch (e) {
          stats.failed++
          log(`  plate#${p.id} video FAILED: ${(e as Error).message}`)
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      stats.skipped++
      continue
    }
    stats.uploaded += Object.keys(updates).length
    if (DRY_RUN) continue
    const { error: upErr } = await supabase
      .from("plate")
      .update(updates)
      .eq("id", p.id)
    if (upErr) {
      stats.failed++
      log(`  plate#${p.id} DB update FAILED: ${upErr.message}`)
    }
  }
}

async function migrateAds() {
  log("=== Ads: media_url ===")
  const { data, error } = await supabase
    .from("ad")
    .select("id, media_url")
  if (error) throw error

  for (const a of data ?? []) {
    stats.scanned++
    if (!isLegacy(a.media_url)) {
      stats.skipped++
      continue
    }
    const decoded = decodeDataUrl(a.media_url)
    if (!decoded) {
      log(`  ad#${a.id} media_url: cannot decode, skipping`)
      continue
    }
    const path = `${randomUUID()}.${decoded.ext}`
    try {
      const url = await uploadDecoded("ads", path, decoded)
      if (!DRY_RUN) {
        const { error: upErr } = await supabase
          .from("ad")
          .update({ media_url: url })
          .eq("id", a.id)
        if (upErr) throw upErr
      }
      stats.uploaded++
      log(`  ad#${a.id} -> ${path} (${decoded.buffer.byteLength}B)`)
    } catch (e) {
      stats.failed++
      log(`  ad#${a.id} FAILED: ${(e as Error).message}`)
    }
  }
}

// -----------------------------------------------------------------------------
// Validation
// -----------------------------------------------------------------------------

async function validate() {
  log("=== Post-migration validation ===")

  const { count: restLegacy } = await supabase
    .from("restaurant")
    .select("id", { count: "exact", head: true })
    .or("logo->>path.like.data:%,cover->>path.like.data:%")

  const { count: plateLegacy } = await supabase
    .from("plate")
    .select("id", { count: "exact", head: true })
    .or("image->>path.like.data:%,video->>path.like.data:%")

  const { count: adLegacy } = await supabase
    .from("ad")
    .select("id", { count: "exact", head: true })
    .like("media_url", "data:%")

  log(`  restaurants with remaining data: rows = ${restLegacy ?? "?"}`)
  log(`  plates      with remaining data: rows = ${plateLegacy ?? "?"}`)
  log(`  ads         with remaining data: rows = ${adLegacy ?? "?"}`)

  if ((restLegacy ?? 0) + (plateLegacy ?? 0) + (adLegacy ?? 0) === 0) {
    log("✅ All media migrated.")
  } else {
    log("⚠️  Some rows still hold base64. Re-run the script.")
  }
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

;(async () => {
  log(`Starting backfill — DRY_RUN=${DRY_RUN} ONLY=${ONLY ?? "all"}`)
  log(`Target: ${SUPABASE_URL}`)

  if (!ONLY || ONLY === "restaurants") await migrateRestaurants()
  if (!ONLY || ONLY === "plates") await migratePlates()
  if (!ONLY || ONLY === "ads") await migrateAds()

  log("=== Summary ===")
  log(`  scanned:  ${stats.scanned}`)
  log(`  uploaded: ${stats.uploaded}`)
  log(`  skipped:  ${stats.skipped}`)
  log(`  failed:   ${stats.failed}`)
  log(`  bytes:    ${stats.bytesUploaded} (${(stats.bytesUploaded / 1024 / 1024).toFixed(2)} MB)`)

  if (!DRY_RUN) await validate()

  log(`Log written to ${LOG_PATH}`)
  process.exit(stats.failed > 0 ? 2 : 0)
})().catch((e) => {
  console.error("Unhandled error:", e)
  process.exit(1)
})
