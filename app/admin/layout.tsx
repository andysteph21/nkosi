import { redirect } from "next/navigation"
import getProfile from "@/hooks/useProfile"

const ADMIN_ROLES = new Set(["admin", "super_admin"])

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getProfile()

  if (!profile || !ADMIN_ROLES.has(profile.role)) {
    redirect("/")
  }

  return <>{children}</>
}
