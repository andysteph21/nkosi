"use client"

import Image from "next/image"

const featuredRestaurants = [
  { id: 1, name: "Saveurs d'Afrique", image: "/restaurants/saveurs-afrique.jpg" },
  { id: 2, name: "Jollof King", image: "/restaurants/jollof-king.jpg" },
  { id: 3, name: "Le Sahel", image: "/restaurants/le-sahel.jpg" },
  { id: 4, name: "Mama's Kitchen", image: "/restaurants/mamas-kitchen.jpg" },
  { id: 5, name: "Chez Fatou", image: "/restaurants/chez-fatou.jpg" },
  { id: 6, name: "Yassa Express", image: "/restaurants/yassa-express.jpg" },
]

export function FeaturedRestaurants() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Restaurants populaires</h3>
      <div className="flex gap-6 overflow-x-auto pb-2 scrollbar-hide">
        {featuredRestaurants.map((restaurant) => (
          <button
            key={restaurant.id}
            className="flex flex-col items-center gap-2 group flex-shrink-0"
          >
            <div className="relative w-20 h-20 rounded-full overflow-hidden ring-2 ring-transparent group-hover:ring-primary transition-all">
              <Image
                src={restaurant.image || "/placeholder.svg"}
                alt={restaurant.name}
                fill
                className="object-cover"
              />
            </div>
            <span className="text-sm text-foreground/80 group-hover:text-primary transition-colors text-center max-w-20">
              {restaurant.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
