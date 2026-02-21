"use client"

import { createContext, useContext, useMemo, useState } from "react"
import type { Profile } from "@/lib/types"

interface AuthContextValue {
  profile: Profile | null
  setProfile: (profile: Profile | null) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({
  initialProfile,
  children,
}: {
  initialProfile: Profile | null
  children: React.ReactNode
}) {
  const [profile, setProfile] = useState<Profile | null>(initialProfile)

  const value = useMemo(
    () => ({
      profile,
      setProfile,
    }),
    [profile]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider")
  }
  return ctx
}
