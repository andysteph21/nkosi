"use client"

import { createContext, useContext, useMemo, useState, useEffect } from "react"
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

  // useState only reads its argument on first mount. When the server re-renders
  // the layout after a redirect (e.g. after sign-in), the new initialProfile
  // prop is ignored unless we sync it here.
  useEffect(() => {
    setProfile(initialProfile)
  }, [initialProfile])

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
