# NKOSI — Plan de migration prod (utilisateurs déjà en place)

Date : 13 mai 2026
Projet Supabase : `zahdtdzgoxkcglgsosgi` — région `ca-central-1`, Postgres `17.6.1`
URL : `https://zahdtdzgoxkcglgsosgi.supabase.co`
Connecteur MCP : **read-only** (toute écriture doit être faite par toi via la console SQL Supabase, `supabase` CLI, ou en repassant temporairement le MCP en mode write).

---

## 1. État réel de la prod

### 1.1 Utilisateurs

8 comptes `auth.users` ↔ 8 profils — **liens intacts à 100 %, aucun orphelin** :

Rôle | Compte
---|---
super_admin | superadmin@nkosi.local (dernier login 2026-03-07)
admin | ndongbibangmr@gmail.com (dernier login 2026-04-25)
restaurateur | michelrufinnb@gmail.com (2026-04-26)
restaurateur | belgracemondjo@gmail.com (2026-05-04)
restaurateur | gracekoumba65@gmail.com (2026-05-07) → resto 7 « Jeannelvie »
restaurateur | us.tilldeathdousapart@gmail.com (2026-04-21)
restaurateur | chandryboussamba23@gmail.com (2026-04-21)
client | restaurationpratique@gmail.com (2026-04-22)

⚠️ Tous les profils ont `confirmed_at = NULL` sauf le super admin. Le trigger `handle_user_confirmed` qui devrait mettre à jour `profile.confirmed_at` quand `auth.users.email_confirmed_at` passe à `NOT NULL` **n'a manifestement pas tourné** — alors que les `auth.users` correspondants ont bien `email_confirmed_at` à jour. À vérifier (sans doute migration 00001 chargée *avant* que les users existent, et le trigger a bien le scope `after update of email_confirmed_at` donc une création ne le déclenche pas). À backfiller :

```sql
update public.profile p
set confirmed_at = u.email_confirmed_at, updated_at = now()
from auth.users u
where p.user_id = u.id
  and p.confirmed_at is null
  and u.email_confirmed_at is not null;
```

### 1.2 Données métier

Table | Lignes | Note
---|---|---
restaurant | 4 | 2 actifs complets (id 1, 2), 2 « fantômes » (id 4, 7) sans logo, sans cover, **sans aucun horaire** mais `is_visible = true` → visibles sur la home avec un placeholder vide
plate | 14 | 12 sur les 2 restos actifs, 0 sur les fantômes
restaurant_cuisine | 12 | resto 4 n'a qu'1 cuisine, les autres 3–4
restaurant_schedule | 14 | 7 jours × 2 restos. Les restos 4 et 7 n'ont aucun horaire en base
cuisine | 6 | ⚠️ une entrée s'appelle littéralement « `Fastfood \|` » (avec une barre verticale). Probable copier-coller buggé.
category | 8 | OK
ad | 4 | 4 actives, dont 1 expirée le 2026-04-30 mais toujours `is_active = true` car la cron de désactivation (`supabase/functions/deactivate-expired-ads/`) **n'est pas déployée** (0 edge function en prod)
favorite | 0 | feature jamais utilisée
notification | 0 | idem
visibility_request | 2 | les deux « approved »

### 1.3 Volume base64 — le cœur du problème

Mesure | Valeur
---|---
DB totale | **56 MB**
Table `plate` (totale) | **43 MB**
Images base64 dans `plate.image` | 1.8 MB (14 lignes)
Vidéos base64 dans `plate.video` | **15 MB** (4 lignes — le plat #42 « Bébé dort bien » fait à lui seul 8.5 MB)
Images base64 dans `ad.media_url` | ~480 kB (4 lignes)
Logos+covers restaurants base64 | ~150 kB (2 restos sur 4)

**Top 5 lignes les plus lourdes :**

ID | Resto | Plat | Poids
---|---|---|---
42 | Délice by D&G | Bébé dort bien | 8.5 MB
48 | Délice by D&G | riz sauté | 2.7 MB
41 | Délice by D&G | crêpe farcies | 2.7 MB
35 | Les délices de Meralda | Hambúrguer | 1.8 MB
50 | Les délices de Meralda | Pizza pepperoni | 547 kB

Sans migration, chaque chargement complet de la fiche du restaurant 2 = ~14 MB de JSON. C'est ce qui rend la home inutilisable sur 3G/Edge.

### 1.4 Buckets Storage

**0 bucket configuré, 0 objet, 0 byte.** Confirmé : on doit tout créer.

### 1.5 Edge functions

**Aucune en prod.** Le code `supabase/functions/deactivate-expired-ads/index.ts` existe en local mais n'a jamais été déployé.

### 1.6 Migrations

Identiques au repo local : `00001_initial_schema`, `00002_rls_policies`, `00003_fix_rls_helper_functions`, `00004_plate_sort_order`, `00005_favorite_client_only_rls`. **Schema en phase.** ✅

### 1.7 Advisors Supabase — résumé

**Sécurité** (16 WARN) :
- 10× `anon_security_definer_function_executable` — toutes les fonctions RLS-helper et les RPC d'increment sont exposées via PostgREST (`/rest/v1/rpc/...`). C'est le résultat de la migration `00003` qui fait explicitement `grant execute to anon, authenticated`. Les RPC `increment_restaurant_views/likes/clicks` doivent rester accessibles à `anon` (pour les compteurs publics) mais avec validation. Les helpers `current_profile_id/role`, `is_admin_like`, `is_super_admin` ne devraient pas être appelables directement par REST — il faut `revoke execute ... from anon, authenticated` (la RLS les invoque quand même via SECURITY DEFINER, c'est l'API REST exposée qui pose problème).
- 1× `function_search_path_mutable` sur `set_updated_at` — ajouter `set search_path = public`.
- 1× `auth_leaked_password_protection` désactivé — à activer dans Dashboard → Authentication → Policies.

**Performance** (~50 INFO/WARN) :
- 8 foreign keys sans index couvrant (`plate.restaurant_id`, `plate.category_id`, `category.restaurant_id`, `favorite.restaurant_id`, `restaurant_cuisine.cuisine_id`, `notification.profile_id`, `ad.created_by`, `visibility_request.reviewed_by`).
- 3 `auth_rls_initplan` sur la table `profile` — `auth.uid()` est recalculé par ligne, à wrapper en `(select auth.uid())`.
- ~40 `multiple_permissive_policies` — chaque table (`ad`, `category`, `cuisine`, `favorite`, `plate`, `restaurant`, `restaurant_cuisine`, `restaurant_schedule`) a sa policy `owner_write FOR ALL` qui se cumule avec la policy `public_read FOR SELECT` sur le rôle `anon`/`authenticated`. Les deux policies sont évaluées à chaque `SELECT`. Fix : remplacer les `FOR ALL` par `FOR INSERT/UPDATE/DELETE` séparés.
- 1× `auth_db_connections_absolute` — l'Auth utilise 10 connexions absolues, passer en stratégie « pourcentage » dès que tu montes l'instance.

---

## 2. Stratégie globale (zero-downtime, réversible)

L'app a 8 utilisateurs et un mois d'activité. On ne peut pas se permettre :
- de perdre des images existantes,
- de cassér l'auth (login déjà confirmé pour 7/8 comptes),
- d'introduire une fenêtre où le site n'affiche plus rien.

Donc on suit un schéma **dual-read / dual-write**, en 6 phases :

```
Phase 0  →  snapshot + branche Supabase de test
Phase 1  →  préparer le code pour LIRE depuis bucket OU base64 (fallback)
Phase 2  →  créer buckets + RLS + déployer ce code → aucun changement visible
Phase 3  →  backfill : convertir les base64 existants en objets Storage
Phase 4  →  changer le code d'écriture : nouveaux uploads → bucket uniquement
Phase 5  →  cleanup : drop les colonnes base64 résiduelles, hardening (RLS, index, edge fn)
```

Chaque phase est indépendamment réversible. À aucun moment l'app n'est cassée pour les utilisateurs.

---

## 3. Phase 0 — Snapshot & branche de test

### 3.1 Backup explicite (≤ 5 min)

Supabase fait un backup quotidien automatique mais on en veut un *daté* avant toute modif :

```bash
# Dashboard → Database → Backups → "Create backup"
# OU via CLI :
supabase db dump --linked --data-only -f backup-pre-migration-$(date +%F).sql
supabase db dump --linked --role-only -f backup-roles-pre-migration-$(date +%F).sql
```

### 3.2 Branche Supabase de test

Le plan Pro/Team de Supabase permet de créer une *Database branch* qui clone le schéma. C'est l'endroit idéal pour répéter chaque phase avant la prod :

```
Dashboard → Branches → Create branch "migration-images"
```

Tu auras une URL `https://<branch-ref>.supabase.co` distincte. Le `.env.staging` de l'app pointera dessus.

Si tu n'as pas accès aux branches (plan Free), créer un **second projet** Supabase « nkosi-staging » et y appliquer les migrations 00001→00005 plus un seed de quelques restos.

### 3.3 Vérifications préalables

```sql
-- Sanity check : aucun orphan
select 'orphan_profile' as kind, count(*) from public.profile p
left join auth.users u on u.id = p.user_id where u.id is null
union all
select 'orphan_authuser', count(*) from auth.users u
left join public.profile p on p.user_id = u.id where p.id is null;
-- Attendu : 0 sur les deux lignes (confirmé aujourd'hui)
```

---

## 4. Phase 1 — Préparer le code en mode dual-read

**Objectif :** déployer une version qui sait lire *à la fois* depuis `bucket` (URL https) et depuis `base64` (data:). Aucune écriture changée. Aucune migration SQL.

### 4.1 Helper de lecture d'URL d'image

Créer `lib/media.ts` :

```ts
const SUPABASE_PUBLIC = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public`

/** Resolve a stored image reference (legacy base64 OR new bucket URL) to a renderable URL. */
export function resolveMediaUrl(value: string | null | undefined): string {
  if (!value) return "/placeholder.svg"
  // Already an absolute URL (new world)
  if (value.startsWith("http")) return value
  // Legacy base64 (data:image/...)
  if (value.startsWith("data:")) return value
  // Bucket path stored without prefix (e.g. "restaurants/2/cover-xxx.webp")
  return `${SUPABASE_PUBLIC}/${value.replace(/^\//, "")}`
}
```

Remplacer dans tous les composants (`restaurant-card`, `restaurant-hero`, `dish-card`, `ad-carousel`, `restaurant-info-form`, etc.) `src={image}` par `src={resolveMediaUrl(image)}`.

**Aucun impact visible** : tant que la base contient encore du base64, on l'affiche. Quand elle contiendra des URLs Supabase, on les affichera aussi.

### 4.2 Mettre à jour `next.config.mjs`

```js
const SUPABASE_HOST = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://zahdtdzgoxkcglgsosgi.supabase.co").hostname

const nextConfig = {
  output: "standalone",
  typescript: { ignoreBuildErrors: false }, // ← réactiver
  images: {
    remotePatterns: [
      { protocol: "https", hostname: SUPABASE_HOST, pathname: "/storage/v1/object/public/**" },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
}
```

### 4.3 Build et déploiement

```bash
docker compose --env-file .env.production up -d --build
```

→ Le site fonctionne exactement comme avant. **C'est le moment d'observer la prod 24-48 h** pour t'assurer que les utilisateurs voient toujours leurs photos.

---

## 5. Phase 2 — Créer les buckets Storage en prod

### 5.1 Migration SQL `00006_storage_buckets.sql`

```sql
-- Buckets publics avec quota et MIME whitelist
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('restaurants', 'restaurants', true, 5242880,
     array['image/jpeg','image/png','image/webp','video/mp4']),
  ('ads',         'ads',         true, 5242880,
     array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Lecture publique anonyme
create policy "public_read_restaurants" on storage.objects
  for select using (bucket_id = 'restaurants');

create policy "public_read_ads" on storage.objects
  for select using (bucket_id = 'ads');

-- Écriture restaurants : propriétaire (chemin "<profile_id>/...") OU admin
create policy "owner_insert_restaurants" on storage.objects
  for insert with check (
    bucket_id = 'restaurants'
    and (public.is_admin_like()
         or (storage.foldername(name))[1] = public.current_profile_id()::text)
  );

create policy "owner_update_restaurants" on storage.objects
  for update using (
    bucket_id = 'restaurants'
    and (public.is_admin_like()
         or (storage.foldername(name))[1] = public.current_profile_id()::text)
  ) with check (
    bucket_id = 'restaurants'
    and (public.is_admin_like()
         or (storage.foldername(name))[1] = public.current_profile_id()::text)
  );

create policy "owner_delete_restaurants" on storage.objects
  for delete using (
    bucket_id = 'restaurants'
    and (public.is_admin_like()
         or (storage.foldername(name))[1] = public.current_profile_id()::text)
  );

-- Écriture publicités : admin only
create policy "admin_all_ads" on storage.objects
  for all using (bucket_id = 'ads' and public.is_admin_like())
  with check (bucket_id = 'ads' and public.is_admin_like());
```

Convention de chemins :
- `restaurants/<profile_id>/<restaurant_id>/cover-<uuid>.webp`
- `restaurants/<profile_id>/<restaurant_id>/logo-<uuid>.webp`
- `restaurants/<profile_id>/<restaurant_id>/plates/<plate_id>-<uuid>.webp`
- `restaurants/<profile_id>/<restaurant_id>/plates/<plate_id>-<uuid>.mp4`
- `ads/<uuid>.webp`

Le premier segment `<profile_id>` permet à la RLS Storage de comparer `storage.foldername(name)[1] = current_profile_id()::text`.

### 5.2 Application

```bash
supabase db push  # applique 00006 sur la prod liée
```

ou via Dashboard → SQL Editor (coller le contenu, exécuter).

À la fin :
```sql
select * from storage.buckets;            -- doit afficher 2 lignes
select count(*) from storage.objects;      -- 0 pour l'instant
```

---

## 6. Phase 3 — Backfill base64 → bucket

C'est l'étape la plus délicate : il faut convertir 14 images + 4 vidéos + 2 logos + 2 covers + 4 ads, **sans casser l'app pendant la conversion** (grâce au dual-read de la phase 1).

### 6.1 Script Node `scripts/migrate-images-to-bucket.ts`

```ts
import { createClient } from "@supabase/supabase-js"
import { randomUUID } from "node:crypto"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // bypass RLS
  { auth: { persistSession: false } }
)

/** Convert a "data:image/jpeg;base64,..." string to { buffer, mime, ext } */
function decodeDataUrl(dataUrl: string) {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!m) return null
  const mime = m[1]
  const ext = mime.split("/")[1].replace("jpeg", "jpg")
  return { buffer: Buffer.from(m[2], "base64"), mime, ext }
}

async function uploadDataUrl(
  bucket: "restaurants" | "ads",
  path: string,
  dataUrl: string,
) {
  const decoded = decodeDataUrl(dataUrl)
  if (!decoded) throw new Error(`Not a data URL`)
  const { error } = await supabase.storage.from(bucket).upload(path, decoded.buffer, {
    contentType: decoded.mime,
    upsert: false,
  })
  if (error) throw error
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

async function migrateRestaurants() {
  const { data: rows } = await supabase
    .from("restaurant")
    .select("id, profile_id, logo, cover")
  for (const r of rows ?? []) {
    const logoPath = r.logo?.path
    const coverPath = r.cover?.path
    const updates: Record<string, any> = {}
    if (logoPath?.startsWith("data:")) {
      const url = await uploadDataUrl(
        "restaurants",
        `${r.profile_id}/${r.id}/logo-${randomUUID()}.${decodeDataUrl(logoPath)!.ext}`,
        logoPath,
      )
      updates.logo = { path: url }
    }
    if (coverPath?.startsWith("data:")) {
      const url = await uploadDataUrl(
        "restaurants",
        `${r.profile_id}/${r.id}/cover-${randomUUID()}.${decodeDataUrl(coverPath)!.ext}`,
        coverPath,
      )
      updates.cover = { path: url }
    }
    if (Object.keys(updates).length) {
      await supabase.from("restaurant").update(updates).eq("id", r.id)
      console.log(`restaurant ${r.id} migrated:`, Object.keys(updates))
    }
  }
}

async function migratePlates() {
  const { data: rows } = await supabase
    .from("plate")
    .select("id, restaurant_id, image, video, restaurant:restaurant_id(profile_id)")
  for (const p of rows ?? []) {
    const updates: Record<string, any> = {}
    const profileId = (p as any).restaurant.profile_id
    const imagePath = p.image?.path
    const videoPath = p.video?.path
    if (imagePath?.startsWith("data:")) {
      const url = await uploadDataUrl(
        "restaurants",
        `${profileId}/${p.restaurant_id}/plates/${p.id}-${randomUUID()}.${decodeDataUrl(imagePath)!.ext}`,
        imagePath,
      )
      updates.image = { path: url }
    }
    if (videoPath?.startsWith("data:")) {
      const url = await uploadDataUrl(
        "restaurants",
        `${profileId}/${p.restaurant_id}/plates/${p.id}-${randomUUID()}.mp4`,
        videoPath,
      )
      updates.video = { path: url }
    }
    if (Object.keys(updates).length) {
      await supabase.from("plate").update(updates).eq("id", p.id)
      console.log(`plate ${p.id} migrated:`, Object.keys(updates))
    }
  }
}

async function migrateAds() {
  const { data: rows } = await supabase
    .from("ad")
    .select("id, media_url")
  for (const a of rows ?? []) {
    if (!a.media_url?.startsWith("data:")) continue
    const url = await uploadDataUrl(
      "ads",
      `${randomUUID()}.${decodeDataUrl(a.media_url)!.ext}`,
      a.media_url,
    )
    await supabase.from("ad").update({ media_url: url }).eq("id", a.id)
    console.log(`ad ${a.id} migrated`)
  }
}

;(async () => {
  console.log("=== Restaurants ===");  await migrateRestaurants()
  console.log("=== Plates ==="); await migratePlates()
  console.log("=== Ads ==="); await migrateAds()
  console.log("Done.")
})().catch((e) => { console.error(e); process.exit(1) })
```

### 6.2 Exécution

```bash
# d'abord sur la branche/staging
SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=https://<staging>.supabase.co \
  npx tsx scripts/migrate-images-to-bucket.ts

# vérif (staging)
select id, (image->>'path') like 'http%' as in_bucket from public.plate;

# puis prod (read_only=true ⇒ il faudra l'enlever de l'URL MCP ou utiliser le CLI direct)
SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=https://zahdtdzgoxkcglgsosgi.supabase.co \
  npx tsx scripts/migrate-images-to-bucket.ts
```

### 6.3 Validation post-backfill

```sql
-- doit retourner 0
select count(*) from public.plate where image::text like '%data:%' or video::text like '%data:%';
select count(*) from public.restaurant where logo::text like '%data:%' or cover::text like '%data:%';
select count(*) from public.ad where media_url like 'data:%';

-- doit afficher ~24 objets
select count(*), sum((metadata->>'size')::bigint) as bytes_total from storage.objects;
```

À ce stade : la DB est passée de **56 MB → ~10 MB**. Tous les médias sont sur le CDN Supabase, servis avec `Cache-Control: max-age=3600` par défaut.

### 6.4 Plan de rollback

Si quelque chose tourne mal après le script : la phase 1 (dual-read) reste capable d'afficher les `data:` URLs **encore présentes**. On peut donc :
- soit re-jouer le script avec une logique « si déjà http, skip »,
- soit restaurer depuis le backup phase 0.

Le script ci-dessus est idempotent : il ne touche que les lignes dont le `path` commence par `data:`.

---

## 7. Phase 4 — Bascule des écritures vers le bucket

Maintenant que la lecture marche dans les deux mondes et que toute la prod est en bucket, on change les formulaires.

### 7.1 Modifier les 4 modales d'upload

Dans chacune (`components/admin/add-ad-modal.tsx`, `components/my-restaurant/add-dish-modal.tsx`, `edit-dish-modal.tsx`, `restaurant-info-form.tsx`) :

1. Supprimer le `FileReader.readAsDataURL` et le `resizeImage` canvas-based.
2. Appeler à la place :

```ts
import { compressToWebP } from "@/lib/utils/image-compression"  // existe déjà, jamais appelé
import { uploadToBucket } from "@/services/storage.service"      // existe déjà, jamais appelé

async function handleImageFile(file: File) {
  const webp = await compressToWebP(file, /* maxSizeMB */ 1)
  const path = `${profileId}/${restaurantId}/plates/${crypto.randomUUID()}.webp`
  const { publicUrl } = await uploadToBucket("restaurants", path, webp)
  setFormData(prev => ({ ...prev, image: publicUrl }))
}
```

3. Pour la vidéo (plats), la `compressToWebP` ne s'applique pas. Vérifier juste la durée (déjà fait) et la taille (< 5 Mo, à ajouter) avant `uploadToBucket("restaurants", path, file)`.

### 7.2 Adapter `services/restaurant.service.ts` et `ad.service.ts`

Les `update*` et `add*` mettent actuellement `{ path: <data:base64> }` dans la colonne. À partir de maintenant, `path` contient une URL https. Le helper `resolveMediaUrl()` de la phase 1 gère déjà les deux formats — donc le service de lecture n'a rien à changer.

Côté écriture : aucun changement de schéma, on garde la colonne `jsonb` avec `{ path: "https://..." }`. Optionnel : enrichir avec `{ path, blur, width, height }` pour les futurs LQIP.

### 7.3 Cleanup de l'orphan storage en cas d'update

Quand un restaurateur change son logo, l'ancien fichier reste dans le bucket. Deux options :

- **Simple :** ignorer pour l'instant (volume négligeable, Supabase Storage est très bon marché).
- **Propre :** ajouter dans le `updateRestaurantData` une suppression de l'ancien objet :

```ts
if (oldPath && oldPath.startsWith("http")) {
  const key = oldPath.split("/object/public/restaurants/")[1]
  if (key) await supabase.storage.from("restaurants").remove([key])
}
```

### 7.4 Déploiement

```bash
docker compose --env-file .env.production up -d --build
```

→ Désormais tous les nouveaux uploads vont au bucket. Les anciennes lignes (déjà migrées en phase 3) y sont déjà. **L'app a totalement basculé.**

---

## 8. Phase 5 — Cleanup & hardening

### 8.1 Migrer `ad.media_url` de `text` à URL contrainte

Pas indispensable, mais propre :

```sql
alter table public.ad
  add constraint ad_media_url_is_https
  check (media_url ~ '^https?://');
```

Pour `restaurant.logo`, `restaurant.cover`, `plate.image`, `plate.video` (jsonb), on peut valider avec un trigger ou ajouter une contrainte :

```sql
alter table public.restaurant
  add constraint restaurant_cover_is_url
  check (cover is null or (cover->>'path') ~ '^https?://');
-- idem logo, plate.image, plate.video
```

À appliquer **après** un check `select count(*) from ... where path like 'data:%'` qui doit retourner 0.

### 8.2 Régler les advisors de sécu (migration `00007_security_hardening.sql`)

```sql
-- 1) function_search_path_mutable sur set_updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin new.updated_at = now(); return new; end;
$$;

-- 2) Helpers RLS : retirer execute aux rôles publics (la RLS y accède via SECURITY DEFINER)
revoke execute on function public.current_profile_id() from anon, authenticated;
revoke execute on function public.current_profile_role() from anon, authenticated;
revoke execute on function public.is_admin_like() from anon, authenticated;
revoke execute on function public.is_super_admin() from anon, authenticated;

-- 3) handle_user_confirmed n'a pas à être exposé non plus
revoke execute on function public.handle_user_confirmed() from anon, authenticated, public;

-- 4) Backfill manquant des profile.confirmed_at
update public.profile p
set confirmed_at = u.email_confirmed_at, updated_at = now()
from auth.users u
where p.user_id = u.id and p.confirmed_at is null and u.email_confirmed_at is not null;
```

Dans Dashboard → Authentication → Policies : activer **"Leaked password protection"** (HaveIBeenPwned).

### 8.3 Régler les advisors de perf (migration `00008_perf_indexes.sql`)

```sql
-- Foreign keys couvertes
create index if not exists plate_restaurant_id_idx          on public.plate (restaurant_id);
create index if not exists plate_category_id_idx            on public.plate (category_id);
create index if not exists category_restaurant_id_idx       on public.category (restaurant_id);
create index if not exists favorite_restaurant_id_idx       on public.favorite (restaurant_id);
create index if not exists restaurant_cuisine_cuisine_id_idx on public.restaurant_cuisine (cuisine_id);
create index if not exists notification_profile_id_idx      on public.notification (profile_id);
create index if not exists ad_created_by_idx                on public.ad (created_by);
create index if not exists visibility_request_reviewed_by_idx on public.visibility_request (reviewed_by);

-- Index partiel pour la home (très efficace : seulement les restos visibles)
create index if not exists restaurant_visible_idx
  on public.restaurant (id) where is_visible and not is_restricted;

-- RLS init plan : auth.uid() recalculé par row
drop policy if exists profile_self_read on public.profile;
create policy profile_self_read on public.profile
for select using (
  user_id = (select auth.uid()) or public.is_admin_like()
);

drop policy if exists profile_update_self_or_super on public.profile;
create policy profile_update_self_or_super on public.profile
for update using (user_id = (select auth.uid()) or public.is_super_admin())
with check  (user_id = (select auth.uid()) or public.is_super_admin());

drop policy if exists profile_insert_self on public.profile;
create policy profile_insert_self on public.profile
for insert with check (user_id = (select auth.uid()) or public.is_super_admin());

-- Multiple permissive policies : séparer FOR ALL → INSERT/UPDATE/DELETE
-- (à faire table par table — exemple sur public.restaurant ci-dessous)
drop policy if exists restaurant_owner_write on public.restaurant;
create policy restaurant_owner_insert on public.restaurant
  for insert with check (profile_id = public.current_profile_id() or public.is_admin_like());
create policy restaurant_owner_update on public.restaurant
  for update using (profile_id = public.current_profile_id() or public.is_admin_like())
  with check     (profile_id = public.current_profile_id() or public.is_admin_like());
create policy restaurant_owner_delete on public.restaurant
  for delete using (profile_id = public.current_profile_id() or public.is_admin_like());

-- Répéter le pattern pour : ad, cuisine, category, favorite, plate,
-- restaurant_cuisine, restaurant_schedule.
```

### 8.4 Déployer l'edge function `deactivate-expired-ads`

Le code existe en local. La cron-job qui désactiverait les ads expirées n'est pas installée → l'ad #2 (expirée le 2026-04-30) reste `is_active=true` aujourd'hui.

```bash
supabase functions deploy deactivate-expired-ads --no-verify-jwt
# puis dans le dashboard, ajouter un cron (toutes les heures) via pg_cron :
```

```sql
create extension if not exists pg_cron;

select cron.schedule(
  'deactivate-expired-ads',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://zahdtdzgoxkcglgsosgi.supabase.co/functions/v1/deactivate-expired-ads',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.cron_secret', true))
  );
  $$
);
```

(`net.http_post` nécessite l'extension `pg_net` — disponible dans la liste mais non installée actuellement, voir `list_extensions`.)

Alternative plus simple, **purement SQL en cron** :

```sql
select cron.schedule(
  'deactivate-expired-ads',
  '0 * * * *',
  $$ update public.ad set is_active = false where is_active = true and end_date is not null and end_date < now(); $$
);
```

### 8.5 Nettoyage des restos « fantômes »

Restaurant id=4 et id=7 sont `is_visible=true` mais sans horaires, sans logo, sans cover, sans plats. À discuter avec toi : soit `is_visible=false` jusqu'à complétion, soit suppression. Recommandation prudente :

```sql
update public.restaurant
set is_visible = false, updated_at = now()
where id in (4, 7);
```

Et corriger la cuisine « `Fastfood |` » → `Fastfood` :

```sql
update public.cuisine set name = 'Fastfood' where name = 'Fastfood |';
```

### 8.6 Vérifications finales (advisors)

Relancer `get_advisors security` et `get_advisors performance`. Cible :
- 0 `function_search_path_mutable`
- 0 `anon_security_definer_function_executable` (sauf les `increment_*` qui sont intentionnels)
- 0 `auth_rls_initplan`
- 0 `multiple_permissive_policies` (sauf cas explicitement gardés)
- Tous les FKs couverts par un index
- `auth_leaked_password_protection` désactivé → activé

---

## 9. Récap chronologique

Jour | Phase | Action | Risque | Réversible ?
---|---|---|---|---
J | 0 | Backup + branche staging | nul | —
J+1 | 1 | Déployer dual-read (resolveMediaUrl, next.config.mjs) | nul (lecture seule) | rollback container
J+2 | 2 | `00006_storage_buckets.sql` | nul (création buckets) | drop buckets
J+3 | 3 | Script backfill (sur branche d'abord, puis prod) | moyen (mass insert objets) | restore backup
J+4 | 4 | Déployer nouvelles modales d'upload → bucket | nul (anciennes lignes déjà migrées) | rollback container
J+7 | 5 | `00007_security_hardening.sql`, `00008_perf_indexes.sql`, edge fn ads, nettoyage restos | faible | drop indexes, recréer policies depuis backup

Total : **1 semaine pour une migration safe**, dont quelques minutes de travail effectif par jour.

---

## 10. Notes pratiques

- Le connecteur MCP est en `read_only=true`. Pour exécuter les migrations et le script, soit tu repasses le MCP en mode write (URL sans `read_only`), soit tu lances tout via `supabase` CLI / Dashboard SQL Editor — recommandé en prod.
- Avant chaque migration : `supabase db diff --linked` pour t'assurer qu'aucune modif manuelle n'a été faite directement en console depuis la dernière sync.
- Les 17 MB de base64 actuels (essentiellement la vidéo 8.5 MB du plat #42) seront convertis en ~6 MB après compression WebP/MP4 standard et serviront via CDN — gain net sur la home estimé à **97 % de bande passante en moins**.
- Le super admin `superadmin@nkosi.local` n'a pas de domaine réel ; il faudra réfléchir à un compte de secours sur un domaine vrai avant que le bootstrap automatique ne devienne un point de friction (e.g. si tu changes `SUPER_ADMIN_EMAIL` plus tard).
