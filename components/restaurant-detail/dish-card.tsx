import type { Dish } from "@/services/restaurant.service"

interface DishCardProps {
  dish: Dish
}

export function DishCard({ dish }: DishCardProps) {
  return (
    <article className="group overflow-hidden rounded-2xl bg-card border border-border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={dish.image || "/placeholder.svg"}
          alt={dish.name}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          crossOrigin="anonymous"
        />
        {!dish.available && (
          <div className="absolute inset-0 flex items-center justify-center bg-foreground/40">
            <span className="rounded-full bg-card px-4 py-1.5 text-sm font-medium text-destructive">
              Indisponible
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between p-4">
        <h3 className="font-semibold text-card-foreground">{dish.name}</h3>
        <span className="font-bold text-primary whitespace-nowrap ml-3">
          {dish.price.toLocaleString("fr-FR")} {dish.currency}
        </span>
      </div>
      <div className="px-4 pb-4 -mt-1">
        <span className={dish.available ? "text-xs font-medium text-primary" : "text-xs font-medium text-destructive"}>
          {dish.available ? "Disponible" : "Indisponible"}
        </span>
      </div>
    </article>
  )
}
