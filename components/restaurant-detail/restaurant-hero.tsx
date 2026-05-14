"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Heart, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import type { Restaurant } from "@/services/restaurant.service"
import { getIsFavorite, toggleFavorite, type ToggleFavoriteResult } from "@/services/favorite.service"
import { useAuth } from "@/components/providers/auth-provider"
import { resolveMediaUrl } from "@/lib/media"

interface RestaurantHeroProps {
  restaurant: Restaurant
}

export function RestaurantHero({ restaurant }: RestaurantHeroProps) {
  const { profile } = useAuth()
  const isClient = !profile || profile.role === "client"
  // Start as false (matches SSR value) and resolve client-side after mount to
  // avoid blocking the server render on 3 sequential auth → profile → favorite queries.
  const [favorite, setFavorite] = useState(false)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    // profile===null means not logged in — skip the round-trip entirely.
    if (!profile) return
    if (!isClient) return
    getIsFavorite(restaurant.id).then(setFavorite)
  }, [restaurant.id, isClient, profile])
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
          src={resolveMediaUrl(restaurant.image)}
          alt={restaurant.name}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
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
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
          <div className="flex items-end gap-3 md:gap-4">
            {restaurant.logo ? (
              <img
                src={resolveMediaUrl(restaurant.logo)}
                alt={`Logo ${restaurant.name}`}
                loading="lazy"
                decoding="async"
                className="h-12 w-12 shrink-0 rounded-2xl bg-white backdrop-blur-sm object-contain md:h-16 md:w-16"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-card/90 backdrop-blur-sm text-xl font-bold text-primary md:h-16 md:w-16">
                {restaurant.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1
                className="text-xl md:text-3xl font-bold leading-tight text-primary-foreground"
                style={{ overflowWrap: "anywhere" }}
              >
                {restaurant.name}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="flex items-center gap-1.5 text-sm text-primary-foreground/80">
                  <MapPin className="h-4 w-4 shrink-0" />
                  {restaurant.neighborhood}, {restaurant.city}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
