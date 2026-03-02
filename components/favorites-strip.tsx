"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { getMyFavorites } from "@/services/favorite.service"
import { useAuth } from "@/components/providers/auth-provider"

interface FavoriteRestaurant {
  restaurant_id: number
  restaurant: {
    id: number
    name: string
    city: string
    neighborhood: string
    cover: { path?: string } | null
  } | null
}

export function FavoritesStrip() {
  const { profile } = useAuth()
  const [favorites, setFavorites] = useState<FavoriteRestaurant[]>([])
  const [search, setSearch] = useState("")
  const isClient = !profile || profile.role === "client"

  useEffect(() => {
    if (!isClient) return
    getMyFavorites()
      .then((rows) => setFavorites(rows as unknown as FavoriteRestaurant[]))
      .catch(() => setFavorites([]))
  }, [isClient])

  const filtered = useMemo(() => {
    if (!search.trim()) return favorites
    return favorites.filter((row) =>
      row.restaurant?.name?.toLowerCase().includes(search.toLowerCase())
    )
  }, [favorites, search])

  if (!isClient || !favorites.length) return null

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">Mes favoris</h3>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un favori..."
          className="max-w-xs"
        />
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {filtered.map((row) =>
          row.restaurant ? (
            <Link
              href={`/restaurant/${row.restaurant.id}`}
              key={row.restaurant.id}
              className="flex min-w-[220px] rounded-xl border bg-card overflow-hidden hover:bg-accent transition-colors"
            >
              <div className="h-[72px] w-[72px] shrink-0">
                <img
                  src={row.restaurant.cover?.path || "/placeholder.svg"}
                  alt={row.restaurant.name}
                  className="h-full w-full object-cover"
                  crossOrigin="anonymous"
                />
              </div>
              <div className="flex flex-col justify-center px-3 py-2 min-w-0">
                <p className="font-medium truncate">{row.restaurant.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {row.restaurant.neighborhood}, {row.restaurant.city}
                </p>
              </div>
            </Link>
          ) : null
        )}
      </div>
    </section>
  )
}
