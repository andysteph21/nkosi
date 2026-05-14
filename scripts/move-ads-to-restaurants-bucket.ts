/* eslint-disable no-console */
/**
 * scripts/move-ads-to-restaurants-bucket.ts
 *
 * One-shot fix: most browser ad-blockers match any URL containing `/ads/`
 * (see EasyList / uBlock filters), which kills the home carousel for every
 * user. This script moves the 4 ad images out of the `ads` bucket and into
 * `restaurants/__platform/banners/<uuid>.<ext>` — same bucket as the rest of
 * the media, on a path that no ad-blocker filter touches.
 *
 *   ┌─────────────────────────────────────────────────────────────────────┐
 *   │ before                                                              │
 *   │   ad.media_url = https://…/storage/v1/object/public/ads/<uuid>.jpg  │
 *   │ after                                                               │
 *   │   ad.media_url = https://…/storage/v1/object/public/restaurants/    │
 *   │                  __platform/banners/<uuid>.jpg                      │
 *   └─────────────────────────────────────────────────────────────────────┘
 *
 * The Storage RLS policies for the `restaurants` bucket already allow
 * `is_admin_like()` users to write anywhere — including `__platform/...` —
 * so no extra policy change is needed.
 *
 * Idempotent: only touches ads whose `media_url` still points at `/ads/`.
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     pnpm dlx tsx scripts/move-ads-to-restaurants-bucket.ts
 *
 *   pnpm dlx tsx scripts/move-ads-to-restaurants-bucket.ts --dry-run
 *
 * After all rows are migrated and the home renders correctly, run the
 * cleanup migration (see end of MIGRATION_PLAN.md) to drop the `ads` bucket.
 */

import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.")
  process.exit(1)
}
const DRY_RUN = process.argv.includes("--dry-run")

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const SOURCE_BUCKET = "ads"
const TARGET_BUCKET = "restaurants"
const TARGET_PREFIX = "__platform/banners"
const PUBLIC_PATTERN = `${SUPABASE_URL}/storage/v1/object/public/${SOURCE_BUCKET}/`

interface Stats {
  scanned: number
  moved: number
  skipped: number
  failed: number
}
const stats: Stats = { scanned: 0, moved: 0, skipped: 0, failed: 0 }

async function moveOne(adId: number, mediaUrl: string): Promise<void> {
  stats.scanned++

  if (!mediaUrl.startsWith(PUBLIC_PATTERN)) {
    console.log(`  ad#${adId} skipped (not on /ads/ — already migrated?)`)
    stats.skipped++
    return
  }

  // Extract the storage key inside `ads`:  "8b164518-…jpg"
  const sourceKey = mediaUrl.slice(PUBLIC_PATTERN.length)
  const ext = sourceKey.split(".").pop() ?? "bin"
  const targetKey = `${TARGET_PREFIX}/${crypto.randomUUID()}.${ext}`
  const targetUrl = `${SUPABASE_URL}/storage/v1/object/public/${TARGET_BUCKET}/${targetKey}`

  console.log(`  ad#${adId}`)
  console.log(`    from ${SOURCE_BUCKET}/${sourceKey}`)
  console.log(`    to   ${TARGET_BUCKET}/${targetKey}`)

  if (DRY_RUN) {
    stats.moved++
    return
  }

  try {
    // Use the storage SDK's cross-bucket copy (storage-js >= 2.x).
    const { error: copyErr } = await supabase.storage
      .from(SOURCE_BUCKET)
      .copy(sourceKey, targetKey, { destinationBucket: TARGET_BUCKET } as any)
    if (copyErr) {
      // Fallback: manual download + upload, in case the SDK on this version
      // doesn't accept `destinationBucket`.
      console.log(`    sdk copy failed (${copyErr.message}); falling back to download+upload`)
      const { data: blob, error: dlErr } = await supabase.storage
        .from(SOURCE_BUCKET)
        .download(sourceKey)
      if (dlErr || !blob) throw dlErr ?? new Error("download returned no blob")
      const buf = Buffer.from(await blob.arrayBuffer())
      const { error: upErr } = await supabase.storage
        .from(TARGET_BUCKET)
        .upload(targetKey, buf, {
          contentType: blob.type || `image/${ext}`,
          upsert: false,
        })
      if (upErr) throw upErr
    }

    const { error: dbErr } = await supabase
      .from("ad")
      .update({ media_url: targetUrl })
      .eq("id", adId)
    if (dbErr) throw dbErr

    // Source object cleanup. We keep it on dry-run for safety.
    const { error: rmErr } = await supabase.storage
      .from(SOURCE_BUCKET)
      .remove([sourceKey])
    if (rmErr) {
      console.log(`    warning: could not delete source (${rmErr.message}); leaving as orphan`)
    }

    stats.moved++
    console.log(`    ok`)
  } catch (e) {
    stats.failed++
    console.error(`    FAILED: ${(e as Error).message}`)
  }
}

;(async () => {
  console.log(`Moving /ads/ objects → restaurants/__platform/banners — DRY_RUN=${DRY_RUN}`)
  console.log(`Target: ${SUPABASE_URL}`)
  console.log()

  const { data: ads, error } = await supabase
    .from("ad")
    .select("id, media_url")
    .order("id")
  if (error) {
    console.error("Failed to load ads:", error.message)
    process.exit(1)
  }
  if (!ads || ads.length === 0) {
    console.log("No ads in DB. Nothing to do.")
    return
  }

  for (const ad of ads) {
    await moveOne(ad.id, ad.media_url)
  }

  console.log()
  console.log("=== Summary ===")
  console.log(`  scanned: ${stats.scanned}`)
  console.log(`  moved:   ${stats.moved}`)
  console.log(`  skipped: ${stats.skipped}`)
  console.log(`  failed:  ${stats.failed}`)

  process.exit(stats.failed > 0 ? 2 : 0)
})().catch((e) => {
  console.error("Unhandled error:", e)
  process.exit(1)
})
