import { Header } from "@/components/header"
import { HeroBanner } from "@/components/hero-banner"
import { AdCarousel } from "@/components/ad-carousel"
import { RestaurantSection } from "@/components/restaurant-section"
import { Footer } from "@/components/footer"
import { FavoritesStrip } from "@/components/favorites-strip"
import { createClient } from "@/lib/supabase/server"
import { getRestaurantsForListing } from "@/services/restaurant.service"

export default async function Home() {
  let initialRestaurants: Awaited<ReturnType<typeof getRestaurantsForListing>> = []
  try {
    const supabase = await createClient()
    initialRestaurants = await getRestaurantsForListing(supabase)
  } catch {
    // Render with empty list; the client will show skeletons and recover gracefully
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <HeroBanner adSlot={<AdCarousel />} />
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
          <FavoritesStrip />
          <RestaurantSection initialRestaurants={initialRestaurants} />
        </div>
      </main>
      <Footer />
    </div>
  )
}
