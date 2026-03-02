"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronLeft, ChevronRight, ArrowUp } from "lucide-react"
import { RestaurantCard } from "@/components/restaurant-card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Restaurant } from "@/services/restaurant.service"
import { getFilteredRestaurants } from "@/services/restaurant.service"

const ITEMS_PER_PAGE = 6

// Empty initial state - data loads from service
const cachedRestaurants: Restaurant[] = []

interface RestaurantGridProps {
  search: string
  selectedCuisines: string[]
  selectedCity: string
  selectedNeighborhood: string
}

export function RestaurantGrid({ search, selectedCuisines, selectedCity, selectedNeighborhood }: RestaurantGridProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [mobileDisplayCount, setMobileDisplayCount] = useState(ITEMS_PER_PAGE)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [filtered, setFiltered] = useState<Restaurant[]>(cachedRestaurants)
  const [loading, setLoading] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Fetch filtered restaurants when filters change
  useEffect(() => {
    async function fetchRestaurants() {
      setLoading(true)
      try {
        const results = await getFilteredRestaurants({
          search: search.trim() || undefined,
          cuisines: selectedCuisines.length > 0 ? selectedCuisines : undefined,
          city: selectedCity,
          neighborhood: selectedNeighborhood,
        })
        setFiltered(results)
      } catch (error) {
        const normalized =
          error instanceof Error
            ? { message: error.message, stack: error.stack }
            : (error as Record<string, unknown>)
        console.error("Error fetching restaurants:", normalized)
        setFiltered([])
      } finally {
        setLoading(false)
      }
    }

    fetchRestaurants()
  }, [search, selectedCuisines, selectedCity, selectedNeighborhood])

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
    setMobileDisplayCount(ITEMS_PER_PAGE)
    setShowScrollTop(false)
  }, [search, selectedCuisines, selectedCity, selectedNeighborhood])

  // Desktop pagination
  const desktopItems = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  // Mobile progressive loading
  const mobileItems = filtered.slice(0, mobileDisplayCount)

  function handleLoadMore() {
    setMobileDisplayCount((prev) => prev + ITEMS_PER_PAGE)
    if (!showScrollTop) setShowScrollTop(true)
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Intersection Observer for scroll-based loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && mobileDisplayCount < filtered.length) {
          handleLoadMore()
        }
      },
      { threshold: 0.5 }
    )

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => observer.disconnect()
  }, [mobileDisplayCount, filtered.length])

  return (
    <div className="space-y-6" ref={gridRef}>
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-primary">Restaurants</h3>
        <span className="text-sm text-muted-foreground">
          {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <p className="text-muted-foreground">Aucun restaurant trouvé pour cette cuisine.</p>
        </div>
      ) : (
        <>
          {/* Desktop: Paginated view */}
          <div className="hidden md:block space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {desktopItems.map((restaurant) => (
                <RestaurantCard
                  key={restaurant.id}
                  id={restaurant.id}
                  name={restaurant.name}
                  cuisines={restaurant.cuisines.map(c => c.name)}
                  image={restaurant.image}
                  city={restaurant.city}
                  neighborhood={restaurant.neighborhood}
                  position={restaurant.position}
                  tags={restaurant.tags}
                  isFavorite={restaurant.isFavorite}
                  deliveryTime={restaurant.deliveryTime}
                />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-9 w-9"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        "h-9 w-9",
                        currentPage === page && "bg-primary text-primary-foreground"
                      )}
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-9 w-9"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Mobile: Progressive loading */}
          <div className="md:hidden space-y-6">
            <div className="grid grid-cols-1 gap-6">
              {mobileItems.map((restaurant) => (
                <RestaurantCard
                  key={restaurant.id}
                  id={restaurant.id}
                  name={restaurant.name}
                  cuisines={restaurant.cuisines.map(c => c.name)}
                  image={restaurant.image}
                  city={restaurant.city}
                  neighborhood={restaurant.neighborhood}
                  position={restaurant.position}
                  tags={restaurant.tags}
                  isFavorite={restaurant.isFavorite}
                  deliveryTime={restaurant.deliveryTime}
                />
              ))}
            </div>
            {mobileDisplayCount < filtered.length && (
              <div ref={loadMoreRef} className="flex justify-center">
                <Button
                  onClick={handleLoadMore}
                  variant="outline"
                  className="hover:bg-highlight hover:text-highlight-foreground hover:border-highlight"
                >
                  Voir plus
                </Button>
              </div>
            )}
          </div>

          {/* Scroll to top button (mobile only, after first load more) */}
          {showScrollTop && (
            <button
              onClick={scrollToTop}
              className="md:hidden fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all"
              aria-label="Retour en haut"
            >
              <ArrowUp className="h-5 w-5" />
            </button>
          )}
        </>
      )}
    </div>
  )
}
