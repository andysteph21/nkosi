import { redirect } from "next/navigation"
import getProfile from "@/hooks/useProfile"

export default async function CreateRestaurantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getProfile()

  if (!profile || profile.role !== "restaurateur") {
    redirect("/")
  }

  return <>{children}</>
}
