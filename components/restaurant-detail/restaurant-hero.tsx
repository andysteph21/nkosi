"use client"

import { useState } from "react"
import { ArrowLeft, Heart, MapPin, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import type { Restaurant } from "@/services/restaurant.service"
import { toggleFavorite, type ToggleFavoriteResult } from "@/services/favorite.service"
import { useAuth } from "@/components/providers/auth-provider"

interface RestaurantHeroProps {
  restaurant: Restaurant
}

export function RestaurantHero({ restaurant }: RestaurantHeroProps) {
  const { profile } = useAuth()
  const isClient = !profile || profile.role === "client"
  const [favorite, setFavorite] = useState(restaurant.isFavorite)
  const [pending, setPending] = useState(false)
  async function onToggleFavorite() {
    if (pending) return
    setPending(true)
    try {
      const result: ToggleFavoriteResult = await toggleFavorite(restaurant.id)
      if ("requiresAuth" in result) {
        const go = window.confirm("Créez un compte client pour sauvegarder vos favoris. Continuer ?")
        if (go) window.location.href = `/sign-up?role=client&redirect=/restaurant/${restaurant.id}&auto_like=${restaurant.id}`
        return
      }
      if ("favorited" in result) setFavorite(result.favorited)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="relative w-full overflow-hidden rounded-b-3xl md:rounded-3xl">
      {/* Hero Image */}
      <div className="relative aspect-[16/7] min-h-[240px] md:min-h-[320px]">
        <img
          src={restaurant.image || "/placeholder.svg"}
          alt={restaurant.name}
          className="absolute inset-0 h-full w-full object-cover"
          crossOrigin="anonymous"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/30 to-transparent" />

        {/* Top bar */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-card/90 backdrop-blur-sm transition-colors hover:bg-highlight hover:text-highlight-foreground"
            aria-label="Retour"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          {isClient && (
            <button
              onClick={onToggleFavorite}
              disabled={pending}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-card/90 backdrop-blur-sm transition-all hover:bg-highlight hover:scale-110 disabled:opacity-50"
              aria-label={favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            >
              <Heart
                className={cn(
                  "h-5 w-5 transition-colors",
                  favorite ? "fill-primary text-primary" : "text-muted-foreground"
                )}
              />
            </button>
          )}
        </div>

        {/* Restaurant info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-end gap-4">
            {restaurant.logo ? (
              <img
                src={restaurant.logo}
                alt={`Logo ${restaurant.name}`}
                className="h-16 w-16 shrink-0 rounded-2xl bg-card/90 backdrop-blur-sm object-contain"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-card/90 backdrop-blur-sm text-xl font-bold text-primary">
                {restaurant.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold text-primary-foreground text-balance">
                {restaurant.name}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="flex items-center gap-1.5 text-sm text-primary-foreground/80">
                  <MapPin className="h-4 w-4 shrink-0" />
                  {restaurant.neighborhood}, {restaurant.city}
                </span>
                <span className="flex items-center gap-1.5 text-sm text-primary-foreground/80">
                  <Clock className="h-4 w-4 shrink-0" />
                  {restaurant.deliveryTime}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
