import type { Dish, Category } from "@/services/restaurant.service"
import { DishCard } from "@/components/restaurant-detail/dish-card"

interface DishesSectionProps {
  dishes: Dish[]
  categories: Category[]
  restaurantId: number
}

export function DishesSection({ dishes, categories, restaurantId }: DishesSectionProps) {
  if (dishes.length === 0) return null

  const sortedCategories = [...categories].sort((a, b) => a.sortOrder - b.sortOrder)

  const grouped: { category: Category | null; items: Dish[] }[] = sortedCategories.map((cat) => ({
    category: cat,
    items: dishes
      .filter((d) => d.categoryId === cat.id)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  }))

  const uncategorized = dishes
    .filter((d) => !d.categoryId || !categories.some((c) => c.id === d.categoryId))
    .sort((a, b) => a.sortOrder - b.sortOrder)

  if (uncategorized.length > 0) {
    grouped.push({ category: null, items: uncategorized })
  }

  const nonEmpty = grouped.filter((g) => g.items.length > 0)
  if (nonEmpty.length === 0) return null

  return (
    <section className="space-y-8">
      <h2 className="text-xl font-bold text-primary">Nos Plats</h2>
      {nonEmpty.map((group) => (
        <div key={group.category?.id ?? "uncategorized"}>
          {group.category && (
            <h3 className="text-lg font-semibold text-card-foreground mb-4">
              {group.category.name}
            </h3>
          )}
          {!group.category && nonEmpty.length > 1 && (
            <h3 className="text-lg font-semibold text-card-foreground mb-4">Autres</h3>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {group.items.map((dish) => (
              <DishCard key={dish.id} dish={dish} />
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}
