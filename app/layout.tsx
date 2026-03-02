import React from "react"
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { redirect } from "next/navigation"
import './globals.css'
import getProfile from "@/hooks/useProfile"
import { createClient } from "@/lib/supabase/server"
import { AuthProvider } from "@/components/providers/auth-provider"
import { FirstSetupForm } from "@/components/auth/first-setup-form"
import { ensureSuperAdminBootstrapped } from "@/lib/supabase/bootstrap"

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'NKOSI - Découvrez la cuisine africaine',
  description: 'Découvrez les meilleurs restaurants africains près de chez vous',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  await ensureSuperAdminBootstrapped()
  const profile = await getProfile()

  if (profile && !profile.is_active) {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect("/sign-in")
  }

  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <AuthProvider initialProfile={profile}>
          {profile?.must_change_password
            ? <FirstSetupForm profile={profile} />
            : children}
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
