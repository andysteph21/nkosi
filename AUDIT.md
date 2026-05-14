# NKOSI — Audit technique

Date : 13 mai 2026
Périmètre : Next.js 16 (App Router) + Supabase + Caddy/Docker — code repo `nkosi/`
Objectif spécifique : (a) corriger l'usage actuel des images (pas de bucket Storage), (b) rendre l'app utilisable sur connectivité instable (cible : 3G/Edge africains, RTT élevé, pertes de paquets, bande passante < 1 Mbps).

---

## 1. Synthèse exécutive

L'application a une excellente base (App Router, RLS, ISR sur la page resto, Server Actions partielles) mais souffre de **trois défauts majeurs qui dégradent énormément la perf sur réseau instable** :

1. **Toutes les images (logos, couvertures, plats, pubs, vidéos) sont stockées en base64 dans Postgres** (`restaurant.logo`, `restaurant.cover`, `plate.image`, `plate.video` en jsonb ; `ad.media_url` en text). Le code `services/storage.service.ts` qui contient `uploadToBucket()` existe mais **n'est appelé nulle part**. `lib/utils/image-compression.ts` (`compressToWebP`) est lui aussi orphelin.
2. **`next.config.mjs` désactive l'optimisation d'images** (`images.unoptimized: true`) — combiné au point 1, il n'y a aucune compression, aucun WebP/AVIF, aucun `srcset`, aucun CDN cache, aucun lazy-loading natif.
3. **Pas de pagination ni de cache côté homepage** : `getRestaurants()` télécharge toutes les fiches restaurants + tous les plats + toutes les catégories en un seul round-trip, avec les base64 inclus. Sur 50 restaurants × 5 plats × ~200 Ko de base64, on est à **>50 Mo par chargement de l'accueil**.

Le reste (RLS, Caddy, Docker) est correct mais améliorable.

---

## 2. Images & médias (priorité absolue)

### 2.1 Constat

Fichier | Comportement actuel
---|---
`components/admin/add-ad-modal.tsx` | `FileReader.readAsDataURL` → base64 envoyé directement à `createAd()` qui l'écrit dans `ad.media_url` (TEXT).
`components/my-restaurant/restaurant-info-form.tsx` | Idem : crop → base64 → `updateRestaurantData({image, logo})` → écrit dans `restaurant.cover`/`logo` (JSONB `{ path: "<base64>" }`).
`components/my-restaurant/add-dish-modal.tsx` | `resizeImage()` (canvas → `toDataURL`) → base64 → `addDish()` → `plate.image = { path: "<base64>" }`. Vidéo idem (base64 dans `plate.video`).
`services/storage.service.ts` | `uploadToBucket("restaurants"|"ads", ...)` défini mais **0 appel** dans tout le code.
`lib/utils/image-compression.ts` | `compressToWebP(...)` défini mais **0 appel**.
`next.config.mjs` | `images: { unoptimized: true }`.
`supabase/migrations/*` | **Aucune migration** ne crée les buckets `restaurants` et `ads`, ni les policies RLS Storage.

Conséquences concrètes :

- Une image de plat de 800 px JPG ~85 % qualité = ~80 Ko binaire = **~110 Ko en base64** (+33 %). Chaque réponse `select` qui rapatrie le champ `image` rapatrie tout le binaire — il n'y a **aucun moyen de demander la fiche sans l'image**.
- Pas de Cache-Control, pas d'`Etag` image, pas de `If-None-Match` : un client qui revient sur la home re-télécharge tout.
- Pas de transformation côté Supabase (resize, format negotation `image/webp`).
- Postgres n'est pas conçu pour stocker des blobs : index inutiles sur les colonnes jsonb, dump/restore gigantesque, replication slow, WAL gonflé.

### 2.2 Plan de correction (ordre recommandé)

**Étape A — créer les buckets et la migration.** Ajouter `supabase/migrations/00006_storage_buckets.sql` :

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('restaurants', 'restaurants', true, 5242880,
     array['image/jpeg','image/png','image/webp','video/mp4']),
  ('ads',         'ads',         true, 5242880,
     array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Lecture publique
create policy "public_read_restaurants" on storage.objects
  for select using (bucket_id = 'restaurants');
create policy "public_read_ads" on storage.objects
  for select using (bucket_id = 'ads');

-- Écriture restaurant : restaurateur propriétaire OU admin
create policy "owner_write_restaurants" on storage.objects
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
  );

-- Écriture pubs : admin uniquement
create policy "admin_write_ads" on storage.objects
  for all using (bucket_id = 'ads' and public.is_admin_like())
  with check (bucket_id = 'ads' and public.is_admin_like());
```

Convention de chemins : `restaurants/<profile_id>/<restaurant_id>/cover-<uuid>.webp`, `ads/<uuid>.webp`. Le préfixe `<profile_id>` permet la RLS Storage par dossier.

**Étape B — pipeline upload côté client.** Centraliser dans un nouveau hook `hooks/useImageUpload.ts` :

```ts
import { compressToWebP, validateMinDimensions } from "@/lib/utils/image-compression"
import { uploadToBucket } from "@/services/storage.service"

export async function uploadRestaurantImage(
  profileId: number,
  restaurantId: number,
  kind: "logo" | "cover",
  file: File,
) {
  // 1. valider la taille minimum
  const minSide = kind === "logo" ? 256 : 1280
  if (!(await validateMinDimensions(file, minSide, minSide))) {
    throw new Error("Image trop petite")
  }
  // 2. compresser en WebP ≤ 1 Mo, largeur max 1920
  const webp = await compressToWebP(file, kind === "logo" ? 0.3 : 1)
  // 3. upload bucket
  const path = `${profileId}/${restaurantId}/${kind}-${crypto.randomUUID()}.webp`
  const { publicUrl } = await uploadToBucket("restaurants", path, webp)
  return publicUrl
}
```

Puis dans `restaurant-info-form.tsx`, remplacer `setFormData({...formData, logo: croppedDataUrl})` par un appel à `uploadRestaurantImage(...)` qui retourne l'URL publique. Le formulaire stocke **uniquement l'URL** dans `formData.logo` ; la base ne reçoit plus que `{ path: "https://<project>.supabase.co/storage/v1/object/public/restaurants/..." }`.

Idem pour `add-dish-modal`, `edit-dish-modal`, `add-ad-modal`.

**Étape C — migration des données existantes.** Si la prod a déjà des base64, il faut un script one-shot Node qui :
1. `select id, cover, logo from restaurant where (cover->>'path') like 'data:%';`
2. parse base64 → buffer → `supabase.storage.from('restaurants').upload(...)` → récupère l'URL publique
3. `update restaurant set cover = jsonb_set(cover, '{path}', '"<new_url>"') where id = ...`

Placer ce script dans `scripts/migrate-images-to-bucket.ts`. Documenter dans `DEPLOY.md`.

**Étape D — Côté lecture / rendu.** Une fois les URLs absolues en base :

1. `next.config.mjs` :

```js
const nextConfig = {
  output: "standalone",
  typescript: { ignoreBuildErrors: false },   // ← réactiver
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "<project>.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
}
```

   Conserver `unoptimized: true` est tentant pour éviter le coût d'optimisation côté serveur Hostinger, mais sur réseau lent **la conversion WebP/AVIF + le `srcset` Next servi gzip via Caddy est imbattable**. On peut activer un cache disque persistant `volumes: ./next-cache:/app/.next/cache` dans `docker-compose.yml`.

2. Remplacer dans `restaurant-card.tsx`, `restaurant-hero.tsx`, `dish-card.tsx` les balises `<img>` par `<Image>` Next avec `sizes` corrects, `loading="lazy"` (par défaut), `placeholder="blur"` + `blurDataURL` (mini-thumb stocké dans la même colonne JSONB).

3. Retirer tous les `crossOrigin="anonymous"` actuels — inutiles pour des data: URLs, et causeront un preflight CORS inutile une fois les URLs Supabase en place (Supabase Storage ne refuse pas le CORS mais la requête `OPTIONS` ajoute un round-trip).

4. Ajouter dans `caddy/Caddyfile` un cache long pour les chemins `/images/*` (assets `public/`) et éventuellement un reverse-proxy vers Supabase Storage avec `cache_control` pour amortir les retries :

```
@publicImages path /images/* /placeholder.svg
header @publicImages Cache-Control "public, max-age=31536000, immutable"
```

### 2.3 Bonus images

- Générer un **LQIP** (10 px JPEG base64, ~400 octets) au moment de l'upload et le stocker dans `restaurant.cover->>'blur'`. Utiliser comme `blurDataURL` dans `<Image>`. Coût négligeable, gros confort visuel sur 2G.
- Pour les vidéos plats (≤ 10 s), envisager `<video preload="none" poster="<thumb>.webp">` plutôt que `preload="metadata"` — sinon Safari iOS télécharge le moov.
- Activer **Supabase Storage transformations** (resize côté CDN) : `?width=400&quality=70` dans l'URL. Permet de servir une vignette 400 px au lieu du 1920 px sur la home.

---

## 3. Récupération de données (performance, requêtes)

### 3.1 Surfetch sur la home

`app/page.tsx` → `getRestaurantsForListing(supabase)` lit **tous** les restaurants visibles sans LIMIT. Sur 200 restaurants, c'est 200 lignes avec covers (même après passage en bucket : 200 URLs c'est OK, mais le `JOIN` avec `restaurant_cuisine(is_main, cuisine(id, name))` les multiplie).

**Fix :**
- Pagination cursor-based (`gt(id, lastId).limit(24)`) avec « charger plus » côté client (`IntersectionObserver`).
- Index : `create index restaurant_visible_idx on restaurant (id) where is_visible and not is_restricted;`
- Mettre un `revalidate = 60` sur `app/page.tsx` (équivalent ISR home).

### 3.2 Sur-fetch grave dans `getRestaurantById`

`services/restaurant.service.ts:218-226` :

```ts
export async function getRestaurantById(id: number) {
  const restaurants = await getRestaurants()           // ← télécharge TOUT
  return restaurants.find((r) => r.id === id) ?? null
}
```

`getRestaurants()` lit toute la table + tous les plates + toutes les categories. Puis on filtre côté JS. Et `updateRestaurantData()` appelle ensuite `getRestaurantById()` qui re-déclenche tout ça.

**Fix :** appeler `getRestaurantByIdWithClient(supabase, id)` (qui existe déjà et fait les bonnes requêtes ciblées).

### 3.3 Réordonnancement = N round-trips

`reorderCategories` et `reorderDishes` :

```ts
await Promise.all(updates.map(({id, sortOrder}) =>
  supabase.from("category").update({sort_order: sortOrder}).eq("id", id)
))
```

20 plats glissés = 20 requêtes individuelles, perte d'une = ordre incohérent. Sur 3G c'est inutilisable.

**Fix :** créer un RPC Postgres :

```sql
create function public.reorder_plates(p_updates jsonb)
returns void language plpgsql as $$
begin
  update public.plate p
  set sort_order = u.sort_order
  from jsonb_to_recordset(p_updates) as u(id bigint, sort_order int)
  where p.id = u.id;
end; $$ security definer set search_path = public;
```

Un seul appel `supabase.rpc('reorder_plates', { p_updates: updates })`.

### 3.4 Pas de cache navigateur

Aucun appel `supabase` n'a de `Cache-Control`. Tout passe par `fetch` sans cache. Ajouter un wrapper SWR (`@tanstack/react-query` plus moderne) au-dessus des services avec :
- `staleTime: 30s` pour listes
- `retry: 3, retryDelay: exponential`
- `networkMode: 'offlineFirst'`

Bénéfice énorme sur connection flaky : un timeout côté Edge ne casse pas l'UI, retry automatique.

### 3.5 Server Actions vs services dupliqués

`app/actions/plates.ts` définit `createPlateAction/updatePlateAction/deletePlateAction` qui ne sont importés nulle part. Les composants utilisent à la place `addDish/updateDish/removeDish` du service (client-side). Choisir une voie :
- **Recommandation :** Server Actions partout pour les mutations → revalidation native, pas de bundle JS supplémentaire, RLS appliquée via la session SSR. Supprimer la couche service côté client pour les mutations.

### 3.6 `Math.random()` au render

`components/restaurant-card.tsx:60-64` et `ad-carousel.tsx:27` font un shuffle dans un `useEffect` ce qui provoque un re-render visuel après hydration. Préférer un shuffle SSR seedé (par exemple par jour) pour stabilité + cacheabilité.

---

## 4. Connectivité instable — recommandations dédiées

C'est la priorité énoncée. Au-delà des points 2 et 3, mettre en place :

### 4.1 PWA + service worker

L'app n'a actuellement **pas de `manifest.json`, pas de service worker**. Sur 3G/Edge, c'est ce qui fait la différence.

- Ajouter `public/manifest.webmanifest`
- Ajouter `app/sw.ts` (Workbox ou `next-pwa`). Stratégies :
  - `NetworkFirst` 5 s timeout pour `/`, `/restaurant/*`
  - `CacheFirst` pour `/_next/static/*`, `/images/*` et toutes les URLs `supabase.co/storage/v1/object/public/*`
  - `StaleWhileRevalidate` pour les listes JSON (Supabase REST)
- Page offline `app/offline/page.tsx` qui montre les derniers restaurants en cache

### 4.2 Timeouts + retry

Aucun `signal: AbortController` n'est utilisé. Wrapper utilitaire :

```ts
export async function withTimeout<T>(p: Promise<T>, ms = 8000): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))
  ])
}
```

Configurer le client Supabase avec `global: { fetch: (input, init) => fetch(input, {...init, signal: AbortSignal.timeout(8000)}) }`.

### 4.3 Optimistic UI

`toggleFavorite`, `incrementRestaurantClick`, ordre des plats : afficher l'effet immédiatement, rollback sur erreur. Déjà partiellement fait sur le coeur favori. À étendre.

### 4.4 Compression réseau

Le `Caddyfile` a `encode zstd gzip` — bien. Vérifier que Next renvoie bien des HTML déjà compressés (Next 16 le fait). Ajouter :

```
header Vary "Accept-Encoding"
```

et pour les pages SSR du resto :

```
@restaurantPages path /restaurant/*
header @restaurantPages Cache-Control "public, max-age=60, stale-while-revalidate=600"
```

### 4.5 Détection offline

```tsx
const online = useSyncExternalStore(
  (cb) => { window.addEventListener("online", cb); window.addEventListener("offline", cb); return () => {...}},
  () => navigator.onLine, () => true
)
```

Bandeau « Hors connexion — affichage du cache » dans le header.

### 4.6 Bundle weight

`package.json` charge 35+ paquets `@radix-ui/*` + `recharts` (utilisé seulement pour stats). Sur 3G, ça compte.

- Vérifier que `recharts` est en **dynamic import** côté `stats-tab.tsx` : si la page stats n'est jamais ouverte par un visiteur 3G, on doit éviter de la bundler dans le main chunk.
- `lucide-react` : importer par named imports (déjà ok).
- `embla-carousel-react` est en dep mais on utilise un carousel maison dans `ad-carousel.tsx` — soit on l'utilise, soit on le retire.
- Lancer `next build` + `@next/bundle-analyzer` une fois, viser un First Load JS < 150 Ko gzipped.

---

## 5. Sécurité & robustesse Supabase

### 5.1 `next.config.mjs`

```js
typescript: { ignoreBuildErrors: true }
```

Cache des bugs réels. Désactiver et résoudre les erreurs TS (souvent rapides).

### 5.2 `useProfile`

`select("*").single()` lève si profil manquant. Utiliser `.maybeSingle()` (déjà fait ailleurs dans le code, à uniformiser).

### 5.3 Bootstrap super admin

`lib/supabase/bootstrap.ts` :
- `admin.auth.admin.listUsers({ page: 1, perPage: 1000 })` au cold start charge 1000 users — pour un fallback rare. Préférer `admin.auth.admin.getUserByEmail(email)` si disponible (Supabase 2.x), sinon paginer dynamiquement.
- L'`upsert` final repose sur `must_change_password: true`. Si le bootstrap re-tourne après que l'admin a déjà changé son mot de passe, le flag est ré-écrit. Le `return` ligne 53 protège ce cas tant que l'auth user lié existe — mais ajoutez un test : « si profil super_admin lié à un auth user valide existe ET `must_change_password === false`, ne pas écraser ».
- Le bootstrap **bloque le rendu** de chaque page (`await ensureSuperAdminBootstrapped()` dans `app/layout.tsx`). Avec le `bootstrapPromise` mémoïsé c'est OK pour les requêtes suivantes, mais la **première** requête après chaque redémarrage du conteneur est lente. Lancer plutôt l'init dans un script `prestart` ou dans `instrumentation.ts` (hook Next 16 `register()`).

### 5.4 Vercel Analytics

`@vercel/analytics` est importé dans `layout.tsx` mais vous déployez sur Hostinger. Soit retirer, soit accepter l'envoi au CDN Vercel (légèrement contradictoire avec self-hosting).

### 5.5 CSP

Pas d'en-tête `Content-Security-Policy` dans `Caddyfile`. Avec du contenu user-généré (images, vidéos), ajouter :

```
header Content-Security-Policy "default-src 'self'; img-src 'self' data: https://*.supabase.co; media-src 'self' https://*.supabase.co; script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline'; connect-src 'self' https://*.supabase.co"
```

### 5.6 RLS

Les policies sont propres et utilisent des helpers SECURITY DEFINER (migration 3 a bien rajouté `set search_path = public`). Deux remarques :
- `restaurant_cuisine_read` est `using (true)` — la cuisine d'un resto restreint est révélée à tous. Si ce n'est pas voulu : `using (exists (select 1 from restaurant r where r.id=restaurant_id and (...visible...)))`.
- Pas de policy `DELETE` séparée sur `restaurant` — `FOR ALL` couvre, OK. Mais vérifier que `ON DELETE CASCADE` ne supprime pas par accident.

### 5.7 Triggers manquants

Pas de trigger `set_updated_at` sur `favorite` (pas de colonne `updated_at` — OK) ni sur `notification` (pas de colonne — OK).

---

## 6. Infra / Docker / Caddy

### 6.1 Dockerfile

Bonne base alpine + standalone. Améliorations :
- Ajouter `--prod` une fois la build terminée n'est pas trivial avec Next standalone (déjà tree-shaken). OK.
- Le `HEALTHCHECK` `fetch('http://127.0.0.1:3000/')` charge la home **qui inclut `ensureSuperAdminBootstrapped()`** + une requête Supabase. Sur cold start ça peut dépasser le timeout 5 s. Préférer un endpoint léger `/api/health` ou exclure la home du healthcheck (cron interne plutôt).

### 6.2 docker-compose

- Pas de volume pour le cache Next (`.next/cache`) → optimisation d'images Next perdue à chaque restart. Ajouter :
```yaml
volumes:
  - next_cache:/app/.next/cache
```
- Pas de `read_only: true` ni `tmpfs` — durcissement possible.
- `restart: unless-stopped` OK.

### 6.3 Caddy

- HTTP/3 actif (`443/udp` ouvert dans `DEPLOY.md`) — excellent pour mobiles instables.
- `encode zstd gzip` — bon.
- Manque `try_files` ou rate-limit basique (`rate_limit` plugin) — bot scraping → coûts DB.
- Manque Cache-Control sur les images publiques (cf. 2.2).

---

## 7. Code mort / nettoyage

Fichier | Statut
---|---
`services/storage.service.ts` | jamais appelé
`lib/utils/image-compression.ts` | jamais appelé
`app/actions/plates.ts` | jamais importé
`components/featured-restaurants.tsx` | dead code (resto hardcodés avec chemins inexistants `/restaurants/saveurs-afrique.jpg`)
`embla-carousel-react` (dep) | non utilisé (carousel maison dans `ad-carousel.tsx`)
`hooks/use-mobile.ts` + `components/ui/use-mobile.tsx` | doublon
`hooks/use-toast.ts` + `components/ui/use-toast.ts` | doublon
`Caddyfile/` (dossier vide à la racine) | mentionné dans DEPLOY.md, à supprimer

---

## 8. Plan d'attaque recommandé (ordre)

1. **(Bloquant)** Migration storage buckets + RLS Storage (§2.2 étape A) — 1 h.
2. **(Bloquant)** Brancher `uploadToBucket()` + `compressToWebP()` dans les 4 modales d'upload (§2.2 étape B) — 3 h.
3. **(Bloquant)** Script de migration data base64 → bucket (§2.2 étape C) — 2 h.
4. Activer Next Image optimization + remplacer `<img>` par `<Image>` + retirer `crossOrigin` (§2.2 étape D) — 2 h.
5. Fix `getRestaurantById` qui appelle `getRestaurants()` (§3.2) — 30 min.
6. RPC `reorder_plates` / `reorder_categories` (§3.3) — 1 h.
7. Service worker + manifest + cache strategies (§4.1) — 4 h.
8. SWR/React-Query wrapper + timeouts (§4.2, §3.4) — 3 h.
9. Pagination + index `restaurant_visible_idx` (§3.1) — 1 h.
10. Nettoyage code mort + `ignoreBuildErrors: false` (§7, §5.1) — 1 h.

Coût total estimé : ~2,5 jours dev. Gain attendu :
- Taille du JSON homepage : **−95 %** (de ~50 Mo à ~150 Ko).
- TTI sur 3G : de 30–60 s à 3–6 s.
- App utilisable hors-ligne pour la consultation.
- Coûts Postgres / WAL / backup divisés par 10.

---

## 9. Annexe — petites améliorations qualité

- `restaurant-card.tsx` : `displayedTags` shuffle dans un `useEffect` provoque un layout shift → fixer côté serveur.
- `ad-carousel.tsx:25` : `useEffect` sans `initialAds` dans les deps (lint disable implicite).
- `getMyFavoriteRestaurantIds` accepte un client mais `getRestaurants()` ne l'accepte pas — incohérence.
- `getPublicUrl` (storage.service.ts) instancie un nouveau client Supabase à chaque appel — exporter une instance singleton.
- `proxy.ts` (nouveau nom Next 15.5+ pour middleware) — vérifier qu'il s'exécute (logguer `console.log` une fois en dev).
- `currency.ts`, `fuzzy-search.ts` non audités ici (hors scope perf).
