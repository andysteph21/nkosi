# scripts/

One-shot operational scripts. Not part of the application bundle.

## migrate-images-to-bucket.ts

Backfill base64 `data:` blobs stored in Postgres into the Supabase Storage
buckets created by `supabase/migrations/20260514003809_00006_storage_buckets.sql`.

### Prerequisites

1. Buckets `restaurants` and `ads` already exist (migration `00006` applied).
2. A current Postgres backup. The script is idempotent but you do not want to
   discover a bug halfway through.
3. `SUPABASE_SERVICE_ROLE_KEY` for the target project (Dashboard → Project
   Settings → API → `service_role` key). Treat this key like a root password.
4. `tsx` available (provided by pnpm dlx; no install needed).

### Dry run (recommended first)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://zahdtdzgoxkcglgsosgi.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=eyJh...service_role... \
  pnpm dlx tsx scripts/migrate-images-to-bucket.ts --dry-run
```

This walks the same code path but never uploads or updates rows. It produces a
log file `migrate-images-<timestamp>.log` listing exactly what would happen.

### Full migration

```bash
NEXT_PUBLIC_SUPABASE_URL=https://zahdtdzgoxkcglgsosgi.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=eyJh...service_role... \
  pnpm dlx tsx scripts/migrate-images-to-bucket.ts
```

### Partial migration

```bash
# only the ad table
… pnpm dlx tsx scripts/migrate-images-to-bucket.ts --only=ads

# only restaurant.logo / restaurant.cover
… pnpm dlx tsx scripts/migrate-images-to-bucket.ts --only=restaurants

# only plate.image / plate.video
… pnpm dlx tsx scripts/migrate-images-to-bucket.ts --only=plates
```

### Idempotency

The script skips any row whose value does not start with `data:`. You can
re-run after a partial failure and only the still-legacy rows will be
processed. Each successful upload uses a fresh UUID, so retries never reuse a
path that may have been half-written.

### Expected output (NKOSI prod baseline)

```
restaurants: 4 rows scanned, 4 uploads (2 logos + 2 covers, ~150 kB)
plates:      14 rows scanned, 18 uploads (14 images + 4 videos, ~17 MB)
ads:         4 rows scanned, 4 uploads (~480 kB)
total:       ~17.6 MB transferred
```

The DB shrinks from ~56 MB to ~10 MB after a manual `VACUUM FULL`.

### Failure modes

The script logs and counts failures instead of crashing on the first error.
The exit code is `2` if any row failed; `0` on a clean run; `1` on an
unhandled exception. Re-run the command — only rows still on `data:` will be
processed.

### After the migration

Run the validation query at the bottom of `MIGRATION_PLAN.md` §6.3 to confirm
zero `data:` rows remain. Then proceed to Phase 4 (switch new uploads to
bucket) and Phase 5 (hardening).
