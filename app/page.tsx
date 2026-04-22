import { Header } from "@/components/header"
import { HeroBanner } from "@/components/hero-banner"
import { AdCarousel } from "@/components/ad-carousel"
import { RestaurantSection } from "@/components/restaurant-section"
import { Footer } from "@/components/footer"
import { FavoritesStrip } from "@/components/favorites-strip"
import { createClient } from "@/lib/supabase/server"
import { getRestaurantsForListing } from "@/services/restaurant.service"
import { getMyFavoritesForStrip } from "@/services/favorite.service"
import { getActiveAds } from "@/services/ad.service"
import type { FavoriteStripItem } from "@/services/favorite.service"
import type { Ad } from "@/services/ad.service"

/** Stable locale-invariant sort used for filter lists. */
function sortStrings(arr: string[]): string[] {
  return [...arr].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
}

export default async function Home() {
  let initialRestaurants: Awaited<ReturnType<typeof getRestaurantsForListing>> = []
  let initialFavorites: FavoriteStripItem[] = []
  let initialAds: Ad[] = []
  try {
    const supabase = await createClient()
    ;[initialRestaurants, initialFavorites, initialAds] = await Promise.all([
      getRestaurantsForListing(supabase),
      getMyFavoritesForStrip(supabase),
      getActiveAds(supabase),
    ])
  } catch {
    // Render with empty data; client-side hydration handles recovery
  }

  // Compute filter lists server-side so the client receives pre-sorted stable
  // arrays from the RSC payload, avoiding any server/client sort-order mismatch.
  const initialCuisines = sortStrings(
    [...new Set(initialRestaurants.flatMap((r) => r.cuisines.map((c) => c.name)))],
  )
  const initialCities = sortStrings(
    [...new Set(initialRestaurants.map((r) => r.city))],
  )
  const initialNeighborhoods = sortStrings(
    [...new Set(initialRestaurants.map((r) => r.neighborhood))],
  )

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <HeroBanner adSlot={<AdCarousel initialAds={initialAds} />} />
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
          <FavoritesStrip initialFavorites={initialFavorites} />
          <RestaurantSection
            initialRestaurants={initialRestaurants}
            initialCuisines={initialCuisines}
            initialCities={initialCities}
            initialNeighborhoods={initialNeighborhoods}
          />
        </div>
      </main>
      <Footer />
    </div>
  )
}
