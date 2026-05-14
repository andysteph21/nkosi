"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import type { FavoriteStripItem } from "@/services/favorite.service"
import { resolveMediaUrl } from "@/lib/media"

interface FavoritesStripProps {
  initialFavorites: FavoriteStripItem[]
}

export function FavoritesStrip({ initialFavorites }: FavoritesStripProps) {
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    if (!search.trim()) return initialFavorites
    return initialFavorites.filter((row) =>
      row.restaurant?.name?.toLowerCase().includes(search.toLowerCase()),
    )
  }, [initialFavorites, search])

  if (!initialFavorites.length) return null

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
                  src={resolveMediaUrl(row.restaurant.cover?.path)}
                  alt={row.restaurant.name}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex flex-col justify-center px-3 py-2 min-w-0">
                <p className="font-medium truncate">{row.restaurant.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {row.restaurant.neighborhood}, {row.restaurant.city}
                </p>
              </div>
            </Link>
          ) : null,
        )}
      </div>
    </section>
  )
}
