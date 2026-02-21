# NKOSI

Application Next.js + Supabase pour la decouverte de restaurants africains, avec gestion multi-roles:
- `super_admin`
- `admin`
- `restaurateur`
- `client`

## Stack

- Next.js (App Router) + TypeScript
- Supabase (Auth, Postgres, Storage, RLS)
- Tailwind CSS + composants UI

## Prerequis

- Node.js 20+
- pnpm 9+
- Supabase CLI

## Installation

```bash
pnpm install --no-frozen-lockfile
```

## Variables d'environnement

Creer `.env.local` avec:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_BASE_URL=http://localhost:3000

SUPER_ADMIN_EMAIL=superadmin@nkosi.local
SUPER_ADMIN_PASSWORD=ChangeMe123!
SUPER_ADMIN_FIRST_NAME=Super
SUPER_ADMIN_LAST_NAME=Admin
```

Important: `SUPABASE_SERVICE_ROLE_KEY` doit rester strictement cote serveur.

## Lancer en local

1. Demarrer Supabase local:

```bash
supabase start
```

2. Reinitialiser schema + seed (si besoin):

```bash
supabase db reset
```

3. Demarrer l'app:

```bash
pnpm dev
```

## Bootstrap Super Admin

Au chargement de l'application, un bootstrap serveur verifie/repare le compte super admin:
- verification du lien `profile.user_id` <-> `auth.users`
- creation/reparation de l'utilisateur auth si necessaire
- maintien du profil `super_admin`

Fichier principal: `lib/supabase/bootstrap.ts`.

## Commandes utiles

```bash
# Build
pnpm build

# Lint (si configure dans le projet)
pnpm lint

# Type-check (si configure dans le projet)
pnpm tsc --noEmit
```

## Base de donnees

Migrations:
- `supabase/migrations/00001_initial_schema.sql`
- `supabase/migrations/00002_rls_policies.sql`
- `supabase/migrations/00003_fix_rls_helper_functions.sql`

Seed:
- `supabase/seed.sql`

## Notes de debug

- Les logs de Server Actions et du bootstrap apparaissent dans le terminal `pnpm dev`, pas dans la console navigateur.
- Un warning d'hydration avec `chrome-extension://...` vient generalement d'une extension navigateur, pas du code applicatif.
