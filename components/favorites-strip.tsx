"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { getMyFavorites } from "@/services/favorite.service"

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
  const [favorites, setFavorites] = useState<FavoriteRestaurant[]>([])
  const [search, setSearch] = useState("")

  useEffect(() => {
    getMyFavorites()
      .then((rows) => setFavorites(rows as unknown as FavoriteRestaurant[]))
      .catch(() => setFavorites([]))
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return favorites
    return favorites.filter((row) =>
      row.restaurant?.name?.toLowerCase().includes(search.toLowerCase())
    )
  }, [favorites, search])

  if (!favorites.length) return null

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
              className="min-w-[220px] rounded-xl border bg-card p-3 hover:bg-accent transition-colors"
            >
              <p className="font-medium truncate">{row.restaurant.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {row.restaurant.neighborhood}, {row.restaurant.city}
              </p>
            </Link>
          ) : null
        )}
      </div>
    </section>
  )
}
