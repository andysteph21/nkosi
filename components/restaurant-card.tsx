"use client"

import { useState, useMemo } from "react"
import { Heart, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { toggleFavorite } from "@/services/favorite.service"
import { incrementRestaurantClick } from "@/services/restaurant.service"

interface RestaurantCardProps {
  id: number
  name: string
  cuisines: string[]
  image: string
  city: string
  neighborhood: string
  position: string
  tags?: string[]
  isFavorite?: boolean
  deliveryTime: string
}

function getRandomTags(tags: string[], count: number): string[] {
  if (tags.length <= count) return tags
  const shuffled = [...tags].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

export function RestaurantCard({
  id,
  name,
  cuisines,
  image,
  city,
  neighborhood,
  position,
  tags = [],
  isFavorite = false,
  deliveryTime,
}: RestaurantCardProps) {
  const [favorite, setFavorite] = useState(isFavorite)
  const displayedTags = useMemo(() => getRandomTags(tags, 2), [tags])
  const displayedCuisines = cuisines.slice(0, 3)

  async function handleFavoriteClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    const result = await toggleFavorite(id)
    if ((result as any).requiresAuth) {
      const shouldRedirect = window.confirm("Créez un compte client pour ajouter des favoris. Continuer ?")
      if (shouldRedirect) {
        window.location.href = `/sign-up?role=client&redirect=/restaurant/${id}&auto_like=${id}`
      }
      return
    }
    setFavorite(Boolean((result as any).favorited))
  }

  return (
    <Link
      href={`/restaurant/${id}`}
      className="block"
      onClick={() => {
        incrementRestaurantClick(id)
      }}
    >
      <article className="group relative w-full max-w-sm overflow-hidden rounded-2xl bg-card shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
        {/* Image Container */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={image || "/placeholder.svg"}
            alt={name}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            crossOrigin="anonymous"
          />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent" />
        
        {/* Favorite Button */}
        <button
          onClick={handleFavoriteClick}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-card/90 backdrop-blur-sm transition-all duration-200 hover:bg-highlight hover:scale-110"
          aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart
            className={cn(
              "h-5 w-5 transition-colors duration-200",
              favorite ? "fill-primary text-primary" : "text-muted-foreground"
            )}
          />
        </button>
        
        {/* Tags */}
        {displayedTags.length > 0 && (
          <div className="absolute left-3 top-3 flex flex-col sm:flex-row flex-wrap gap-1.5">
            {displayedTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-card/90 px-2.5 py-1 text-xs font-medium text-card-foreground backdrop-blur-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="truncate text-lg font-semibold text-card-foreground transition-colors group-hover:text-highlight-foreground">
          {name}
        </h3>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {displayedCuisines.join(" · ")}
        </p>

        {/* Location */}
        <div className="mt-3 space-y-1">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="truncate">{neighborhood}, {city}</span>
          </div>
          <p className="truncate pl-5.5 text-xs text-muted-foreground/70">{position}</p>
        </div>
      </div>
      </article>
    </Link>
  )
}
