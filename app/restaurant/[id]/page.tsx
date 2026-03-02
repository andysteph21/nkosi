import { getRestaurantByIdWithClient } from "@/services/restaurant.service"
import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { RestaurantHero } from "@/components/restaurant-detail/restaurant-hero"
import { RestaurantInfo } from "@/components/restaurant-detail/restaurant-info"
import { DishesSection } from "@/components/restaurant-detail/dishes-section"
import { notFound } from "next/navigation"

interface RestaurantPageProps {
  params: Promise<{ id: string }>
}

export default async function RestaurantPage({ params }: RestaurantPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const restaurant = await getRestaurantByIdWithClient(supabase, Number(id))

  if (!restaurant) {
    notFound()
  }

  return (
    <div className="min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          <RestaurantHero restaurant={restaurant} />
          <RestaurantInfo restaurant={restaurant} />
          <DishesSection dishes={restaurant.dishes} categories={restaurant.categories} restaurantId={restaurant.id} />
        </div>
      </main>
      <Footer />
    </div>
  )
}
