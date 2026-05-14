/** @type {import('next').NextConfig} */

// Derive the Supabase Storage hostname from the public env var so that
// next/image trusts the bucket URLs we serve. Falls back to the known
// production hostname to ke