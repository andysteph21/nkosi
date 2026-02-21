import type { Dish } from "@/services/restaurant.service"
import { DishCard } from "@/components/restaurant-detail/dish-card"

interface DishesSectionProps {
  dishes: Dish[]
}

export function DishesSection({ dishes }: DishesSectionProps) {
  if (dishes.length === 0) return null

  return (
    <section>
      <h2 className="text-xl font-bold text-primary mb-4">Nos Plats</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {dishes.map((dish) => (
          <DishCard key={dish.id} dish={dish} />
        ))}
      </div>
    </section>
  )
}
