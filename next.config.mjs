/** @type {import('next').NextConfig} */

// Derive the Supabase Storage hostname from the public env var so that
// next/image trusts the bucket URLs we serve. Falls back to the known
// production hostname to keep `next build` working when env vars are
// missing (e.g. linting in CI).
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  ?? "https://zahdtdzgoxkcglgsosgi.supabase.co"
const SUPABASE_HOSTNAME = new URL(SUPABASE_URL).hostname

const nextConfig = {
  output: "standalone",
  experimental: {
    // Plate/restaurant media is uploaded through the `uploadFileAction`
    // Server Action (service-role workaround for the storage-api ES256 JWT
    // issue). Server Actions cap request bodies at 1 MB by default; raise it
    // to cover the 20 MB Storage bucket limit plus multipart overhead.
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
  typescript: {
    // TODO (phase 5 hardening): flip to false and resolve outstanding errors.
    ignoreBuildErrors: true,
  },
  images: {
    // Keep optimization disabled during the dual-read transition so legacy
    // data: URLs (still present in DB) render unchanged. Flip to false in
    // phase 5 once the base64 backfill is complete.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: SUPABASE_HOSTNAME,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
}

export default nextConfig
