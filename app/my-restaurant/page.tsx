import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { MyRestaurantTabs } from "@/components/my-restaurant/my-restaurant-tabs"
import getProfile from "@/hooks/useProfile"
import { createClient } from "@/lib/supabase/server"

export default async function MyRestaurantPage() {
  const profile = await getProfile()
  const supabase = await createClient()

  let restaurantId: number | null = null
  let restaurantLogo = ""

  if (profile) {
    const { data: restaurant } = await supabase
      .from("restaurant")
      .select("id,logo")
      .eq("profile_id", profile.id)
      .maybeSingle()
    restaurantId = restaurant?.id ?? null
    restaurantLogo = (restaurant as any)?.logo?.path ?? ""
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2">Mon Restaurant</h1>
            <p className="text-muted-foreground">Gérez vos informations et votre menu</p>
          </div>
          <MyRestaurantTabs restaurantId={restaurantId} restaurantLogo={restaurantLogo} />
        </div>
      </main>
      <Footer />
    </div>
  )
}
