import { fuzzyMatchAny } from "@/lib/fuzzy-search"
import { createClient as createSupabaseRawClient } from "@supabase/supabase-js"

function getSupabase() {
  return createSupabaseRawClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export interface DayHours {
  day: string
  hours: string
  closed?: boolean
}

export interface Dish {
  id: number
  name: string
  price: number
  currency: string
  image: string
  available: boolean
}

export interface Restaurant {
  id: number
  name: string
  cuisines: string[]
  image: string
  city: string
  neighborhood: string
  position: string
  tags: string[]
  isFavorite: boolean
  deliveryTime: string
  about: string
  hours: DayHours[]
  dishes: Dish[]
  restricted: boolean
  visible?: boolean
}

export interface RestaurantFilters {
  cuisines?: string[]
  city?: string
  neighborhood?: string
  search?: string
}

/**
 * Get all restaurants
 */
export async function getRestaurants(): Promise<Restaurant[]> {
  const supabase = getSupabase()
  const { data: restaurants, error } = await supabase
    .from("restaurant")
    .select(
      "id,name,description,city,neighborhood,address,cover,is_restricted,is_visible,restaurant_schedule(day_of_week,is_closed,open_time,close_time),restaurant_cuisine(is_main,cuisine(name))"
    )
    .order("id")

  if (error) throw error

  const { data: plates } = await supabase.from("plate").select("id,restaurant_id,name,price,image,is_visible")

  return (restaurants ?? []).map((restaurant: any) => {
    const cuisineRows = restaurant.restaurant_cuisine ?? []
    const cuisines = cuisineRows.map((row: any) => row.cuisine?.name).filter(Boolean)
    const scheduleRows = restaurant.restaurant_schedule ?? []
    const dayMap = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    const hours: DayHours[] = dayMap.map((dayKey) => {
      const row = scheduleRows.find((s: any) => s.day_of_week === dayKey)
      if (!row || row.is_closed) {
        return { day: dayLabel(dayKey), hours: "Fermé", closed: true }
      }
      return {
        day: dayLabel(dayKey),
        hours: `${row.open_time?.slice(0, 5) ?? "00:00"} - ${row.close_time?.slice(0, 5) ?? "00:00"}`,
      }
    })

    const dishes = (plates ?? [])
      .filter((p: any) => p.restaurant_id === restaurant.id)
      .map((p: any) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        currency: "F CFA",
        image: p.image?.path ?? "/placeholder.svg",
        available: p.is_visible,
      }))

    return {
      id: restaurant.id,
      name: restaurant.name,
      cuisines,
      image: restaurant.cover?.path ?? "/placeholder.svg",
      city: restaurant.city,
      neighborhood: restaurant.neighborhood,
      position: restaurant.address,
      tags: cuisines,
      isFavorite: false,
      deliveryTime: "20-40 min",
      about: restaurant.description ?? "",
      hours,
      dishes,
      restricted: restaurant.is_restricted,
      visible: restaurant.is_visible,
    }
  })
}

/**
 * Get filtered restaurants
 */
export async function getFilteredRestaurants(filters: RestaurantFilters): Promise<Restaurant[]> {
  const allRestaurants = await getRestaurants()
  return allRestaurants.filter((restaurant) => {
    // Exclude restricted restaurants from public view
    if (restaurant.restricted || !restaurant.visible) return false

    // Cuisine filter
    if (filters.cuisines && filters.cuisines.length > 0) {
      const matchesCuisine = restaurant.cuisines.some((c) =>
        filters.cuisines!.some((fc) => fc.toLowerCase() === c.toLowerCase())
      )
      if (!matchesCuisine) return false
    }

    // City filter
    if (filters.city && filters.city !== "all") {
      if (restaurant.city !== filters.city) return false
    }

    // Neighborhood filter
    if (filters.neighborhood && filters.neighborhood !== "all") {
      if (restaurant.neighborhood !== filters.neighborhood) return false
    }

    // Fuzzy search filter (name and tags)
    if (filters.search && filters.search.trim()) {
      const searchableFields = [
        restaurant.name,
        ...restaurant.tags,
      ]
      if (!fuzzyMatchAny(filters.search, searchableFields)) return false
    }

    return true
  })
}

/**
 * Get restaurant by ID
 */
export async function getRestaurantById(id: number): Promise<Restaurant | null> {
  const restaurants = await getRestaurants()
  const restaurant = restaurants.find((r) => r.id === id) ?? null
  if (!restaurant) return null

  const supabase = getSupabase()
  await supabase.rpc("increment_restaurant_views", { p_restaurant_id: id })
  return restaurant
}

/**
 * Get unique cuisines
 */
export async function getUniqueCuisines(): Promise<string[]> {
  const restaurants = await getRestaurants()
  const allCuisines = restaurants.flatMap((r) => r.cuisines)
  return [...new Set(allCuisines)].sort()
}

/**
 * Get unique cities
 */
export async function getUniqueCities(): Promise<string[]> {
  const restaurants = await getRestaurants()
  return [...new Set(restaurants.map((r) => r.city))].sort()
}

/**
 * Get unique neighborhoods by city
 */
export async function getUniqueNeighborhoods(city?: string): Promise<string[]> {
  const restaurants = await getRestaurants()
  const filtered = city && city !== "all"
    ? restaurants.filter((r) => r.city === city)
    : restaurants
  return [...new Set(filtered.map((r) => r.neighborhood))].sort()
}

/**
 * Get all restricted restaurants (admin only)
 */
export async function getRestrictedRestaurants(): Promise<Restaurant[]> {
  const restaurants = await getRestaurants()
  return restaurants.filter((r) => r.restricted)
}

/**
 * Check if a restaurant is restricted
 */
export async function isRestrictedRestaurant(id: number): Promise<boolean> {
  const supabase = getSupabase()
  const { data } = await supabase.from("restaurant").select("is_restricted").eq("id", id).maybeSingle()
  return data?.is_restricted ?? false
}

/**
 * Restrict a restaurant (hide from clients)
 */
export async function restrictRestaurant(id: number): Promise<boolean> {
  const supabase = getSupabase()
  const { error } = await supabase.from("restaurant").update({ is_restricted: true }).eq("id", id)
  if (error) throw error
  return true
}

/**
 * Unrestrict a restaurant (show to clients)
 */
export async function unrestrictRestaurant(id: number): Promise<boolean> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from("restaurant")
    .update({ is_restricted: false, is_visible: true })
    .eq("id", id)
  if (error) throw error
  return true
}

/**
 * Update restaurant data (name, about, location, etc.)
 */
export async function updateRestaurantData(
  id: number,
  updates: Partial<Omit<Restaurant, 'id' | 'dishes'>>
): Promise<Restaurant | null> {
  const supabase = getSupabase()
  const payload: Record<string, unknown> = {}
  if (updates.name !== undefined) payload.name = updates.name
  if (updates.about !== undefined) payload.description = updates.about
  if (updates.city !== undefined) payload.city = updates.city
  if (updates.neighborhood !== undefined) payload.neighborhood = updates.neighborhood
  if (updates.position !== undefined) payload.address = updates.position
  if (updates.image !== undefined) payload.cover = { path: updates.image }
  const { error } = await supabase.from("restaurant").update(payload).eq("id", id)
  if (error) throw error

  if (updates.hours) {
    const scheduleRows = updates.hours.map((entry) => {
      const day_of_week = reverseDayLabel(entry.day)
      const isClosed = entry.closed || entry.hours.toLowerCase() === "fermé" || entry.hours.trim() === ""
      let openTime: string | null = null
      let closeTime: string | null = null
      if (!isClosed && entry.hours.includes("-")) {
        const [open, close] = entry.hours.split("-").map((x) => x.trim())
        openTime = `${open}:00`
        closeTime = `${close}:00`
      }
      return {
        restaurant_id: id,
        day_of_week,
        is_closed: isClosed,
        open_time: openTime,
        close_time: closeTime,
      }
    })
    await supabase.from("restaurant_schedule").upsert(scheduleRows, { onConflict: "restaurant_id,day_of_week" })
  }

  return getRestaurantById(id)
}

/**
 * Update or modify an existing dish
 */
export async function updateDish(
  restaurantId: number,
  dishId: number,
  updates: Partial<Omit<Dish, 'id'>>
): Promise<Dish | null> {
  const supabase = getSupabase()
  const payload: Record<string, unknown> = {}
  if (updates.name !== undefined) payload.name = updates.name
  if (updates.price !== undefined) payload.price = updates.price
  if (updates.available !== undefined) payload.is_visible = updates.available
  if (updates.image !== undefined) payload.image = { path: updates.image }
  const { data, error } = await supabase
    .from("plate")
    .update(payload)
    .eq("restaurant_id", restaurantId)
    .eq("id", dishId)
    .select("id,name,price,image,is_visible")
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    id: data.id,
    name: data.name,
    price: data.price,
    currency: "F CFA",
    image: data.image?.path ?? "/placeholder.svg",
    available: data.is_visible,
  }
}

/**
 * Add a new dish to a restaurant
 */
export async function addDish(
  restaurantId: number,
  dishData: Omit<Dish, 'id'>
): Promise<Dish | null> {
  const supabase = getSupabase()
  const { data: uncategorized } = await supabase
    .from("category")
    .upsert(
      {
        restaurant_id: restaurantId,
        name: "Non categorise",
        sort_order: 999,
      },
      { onConflict: "name,restaurant_id" }
    )
    .select("id")
    .single()
  const { data, error } = await supabase
    .from("plate")
    .insert({
      restaurant_id: restaurantId,
      category_id: uncategorized?.id ?? null,
      name: dishData.name,
      price: dishData.price,
      image: { path: dishData.image },
      is_visible: dishData.available,
    })
    .select("id,name,price,image,is_visible")
    .single()
  if (error) throw error
  return {
    id: data.id,
    name: data.name,
    price: data.price,
    currency: "F CFA",
    image: data.image?.path ?? "/placeholder.svg",
    available: data.is_visible,
  }
}

/**
 * Remove a dish from a restaurant
 */
export async function removeDish(restaurantId: number, dishId: number): Promise<boolean> {
  const supabase = getSupabase()
  const { error } = await supabase.from("plate").delete().eq("restaurant_id", restaurantId).eq("id", dishId)
  if (error) throw error
  return true
}

export async function incrementRestaurantClick(restaurantId: number) {
  const supabase = getSupabase()
  await supabase.rpc("increment_restaurant_clicks", { p_restaurant_id: restaurantId })
}

function dayLabel(dayKey: string) {
  const labels: Record<string, string> = {
    monday: "Lundi",
    tuesday: "Mardi",
    wednesday: "Mercredi",
    thursday: "Jeudi",
    friday: "Vendredi",
    saturday: "Samedi",
    sunday: "Dimanche",
  }
  return labels[dayKey] ?? dayKey
}

function reverseDayLabel(day: string) {
  const labels: Record<string, string> = {
    Lundi: "monday",
    Mardi: "tuesday",
    Mercredi: "wednesday",
    Jeudi: "thursday",
    Vendredi: "friday",
    Samedi: "saturday",
    Dimanche: "sunday",
  }
  return labels[day] ?? day.toLowerCase()
}
