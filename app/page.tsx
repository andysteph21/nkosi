import { Header } from "@/components/header"
import { HeroBanner } from "@/components/hero-banner"
import { AdCarousel } from "@/components/ad-carousel"
import { RestaurantSection } from "@/components/restaurant-section"
import { Footer } from "@/components/footer"
import { FavoritesStrip } from "@/components/favorites-strip"

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <HeroBanner />
        <div className="py-6">
          <AdCarousel />
        </div>
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
          <FavoritesStrip />
          <RestaurantSection />
        </div>
      </main>
      <Footer />
    </div>
  )
}
