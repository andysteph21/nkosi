import { Clock, MapPin } from "lucide-react"
import type { Restaurant } from "@/services/restaurant.service"

interface RestaurantInfoProps {
  restaurant: Restaurant
}

export function RestaurantInfo({ restaurant }: RestaurantInfoProps) {
  return (
    <div className="space-y-6">
      {/* About */}
      <section className="rounded-2xl bg-card border border-border p-6">
        <h2 className="text-lg font-semibold text-card-foreground">A propos</h2>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{restaurant.about}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {restaurant.cuisines.map((cuisine) => (
            <span
              key={cuisine.id}
              className={
                cuisine.isMain
                  ? "rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
                  : "rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
              }
            >
              {cuisine.name}
            </span>
          ))}
        </div>
      </section>

      {/* Hours & Location */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Hours */}
        <section className="rounded-2xl bg-card border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-card-foreground">Horaires</h2>
          </div>
          <div className="space-y-2.5">
            {restaurant.hours.map((entry) => (
              <div
                key={entry.day}
                className="flex items-center justify-between text-sm"
              >
                <span className="font-medium text-card-foreground">{entry.day}</span>
                <span className={entry.hours === "Fermé" ? "text-destructive font-medium" : "text-muted-foreground"}>
                  {entry.hours}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Location */}
        <section className="rounded-2xl bg-card border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-card-foreground">Localisation</h2>
          </div>
          <p className="text-sm font-medium text-primary">{restaurant.position}</p>
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
            {restaurant.position}, {restaurant.neighborhood}, {restaurant.city}
          </p>
        </section>
      </div>
    </div>
  )
}
