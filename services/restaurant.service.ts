import { fuzzyMatchAny } from "@/lib/fuzzy-search"
import { createBrowserClient } from "@supabase/ssr"
import { createClient as createSupabaseRawClient } from "@supabase/supabase-js"

function getSupabase() {
  // In the browser, use the SSR browser client so the cookie-based auth session
  // (set by @supabase/ssr) is included in requests. RLS then allows the
  // authenticated user to see their own non-visible restaurants.
  // In server context, fall back to the raw client for public (visible) data.
  if (typeof window !== "undefined") {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
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

export interface Category {
  id: number
  name: string
  sortOrder: number
}

export interface Dish {
  id: number
  name: string
  price: number
  currency: string
  image: string
  video: string   // optional short promo video (≤10 s), empty string when absent
  available: boolean
  categoryId: number | null
  sortOrder: number
}

export interface CuisineItem {
  id: number
  name: string
  isMain: boolean
}

export interface Restaurant {
  id: number
  name: string
  cuisines: CuisineItem[]
  image: string   // cover photo (16:9)
  logo: string    // logo (1:1)
  city: string
  neighborhood: string
  position: string
  tags: string[]
  isFavorite: boolean
  deliveryTime: string
  about: string
  hours: DayHours[]
  dishes: Dish[]
  categories: Category[]
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
      "id,name,description,city,neighborhood,address,cover,logo,is_restricted,is_visible,restaurant_schedule(day_of_week,is_closed,open_time,close_time),restaurant_cuisine(is_main,cuisine(id,name))"
    )
    .order("id")

  if (error) throw error

  const { data: plates } = await supabase.from("plate").select("id,restaurant_id,name,price,image,video,is_visible,category_id,sort_order")
  const { data: allCategories } = await supabase.from("category").select("id,restaurant_id,name,sort_order").order("sort_order")

  return (restaurants ?? []).map((restaurant: any) => {
    const cuisineRows = restaurant.restaurant_cuisine ?? []
    const cuisines: CuisineItem[] = cuisineRows
      .filter((row: any) => row.cuisine?.name)
      .map((row: any) => ({ id: row.cuisine.id, name: row.cuisine.name, isMain: row.is_main }))
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
        video: p.video?.path ?? "",
        available: p.is_visible,
        categoryId: p.category_id ?? null,
        sortOrder: p.sort_order ?? 0,
      }))

    const categories: Category[] = (allCategories ?? [])
      .filter((c: any) => c.restaurant_id === restaurant.id)
      .map((c: any) => ({ id: c.id, name: c.name, sortOrder: c.sort_order }))

    return {
      id: restaurant.id,
      name: restaurant.name,
      cuisines,
      image: restaurant.cover?.path ?? "/placeholder.svg",
      logo: restaurant.logo?.path ?? "",
      city: restaurant.city,
      neighborhood: restaurant.neighborhood,
      position: restaurant.address,
      tags: cuisines.map((c) => c.name),
      isFavorite: false,
      deliveryTime: "20-40 min",
      about: restaurant.description ?? "",
      hours,
      dishes,
      categories,
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
        filters.cuisines!.some((fc) => fc.toLowerCase() === c.name.toLowerCase())
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
 * Get a single restaurant using a caller-provided Supabase client.
 * Used by server components that need the user's session for RLS
 * (e.g. admins previewing restricted restaurants).
 */
export async function getRestaurantByIdWithClient(
  supabase: ReturnType<typeof getSupabase>,
  id: number,
): Promise<Restaurant | null> {
  const { data: restaurant, error } = await supabase
    .from("restaurant")
    .select(
      "id,name,description,city,neighborhood,address,cover,logo,is_restricted,is_visible,restaurant_schedule(day_of_week,is_closed,open_time,close_time),restaurant_cuisine(is_main,cuisine(id,name))"
    )
    .eq("id", id)
    .maybeSingle()

  if (error || !restaurant) return null

  const { data: plates } = await supabase
    .from("plate")
    .select("id,name,price,image,video,is_visible,category_id,sort_order")
    .eq("restaurant_id", id)
    .order("sort_order")

  const cuisineRows = restaurant.restaurant_cuisine ?? []
  const cuisines: CuisineItem[] = (cuisineRows as any[])
    .filter((row: any) => row.cuisine?.name)
    .map((row: any) => ({ id: row.cuisine.id ?? 0, name: row.cuisine.name, isMain: row.is_main }))
  const scheduleRows = restaurant.restaurant_schedule ?? []
  const dayMap = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
  const hours: DayHours[] = dayMap.map((dayKey) => {
    const row = (scheduleRows as any[]).find((s: any) => s.day_of_week === dayKey)
    if (!row || row.is_closed) {
      return { day: dayLabel(dayKey), hours: "Fermé", closed: true }
    }
    return {
      day: dayLabel(dayKey),
      hours: `${row.open_time?.slice(0, 5) ?? "00:00"} - ${row.close_time?.slice(0, 5) ?? "00:00"}`,
    }
  })

  const dishes = (plates ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    currency: "F CFA",
    image: p.image?.path ?? "/placeholder.svg",
    video: p.video?.path ?? "",
    available: p.is_visible,
    categoryId: p.category_id ?? null,
    sortOrder: p.sort_order ?? 0,
  }))

  const { data: catData } = await supabase
    .from("category")
    .select("id,name,sort_order")
    .eq("restaurant_id", id)
    .order("sort_order")
  const categories: Category[] = (catData ?? []).map((c: any) => ({ id: c.id, name: c.name, sortOrder: c.sort_order }))

  await supabase.rpc("increment_restaurant_views", { p_restaurant_id: id })

  return {
    id: restaurant.id,
    name: restaurant.name,
    cuisines,
    image: (restaurant as any).cover?.path ?? "/placeholder.svg",
    logo: (restaurant as any).logo?.path ?? "",
    city: restaurant.city,
    neighborhood: restaurant.neighborhood,
    position: restaurant.address,
    tags: cuisines.map((c) => c.name),
    isFavorite: false,
    deliveryTime: "20-40 min",
    about: restaurant.description ?? "",
    hours,
    dishes,
    categories,
    restricted: restaurant.is_restricted,
    visible: restaurant.is_visible,
  }
}

/**
 * Get unique cuisines
 */
export async function getUniqueCuisines(): Promise<string[]> {
  const restaurants = await getRestaurants()
  const allCuisines = restaurants.flatMap((r) => r.cuisines.map((c) => c.name))
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
  if (updates.logo !== undefined) payload.logo = { path: updates.logo }
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
  if (updates.video !== undefined) payload.video = updates.video ? { path: updates.video } : null
  if (updates.categoryId !== undefined) payload.category_id = updates.categoryId
  if (updates.sortOrder !== undefined) payload.sort_order = updates.sortOrder
  const { data, error } = await supabase
    .from("plate")
    .update(payload)
    .eq("restaurant_id", restaurantId)
    .eq("id", dishId)
    .select("id,name,price,image,video,is_visible,category_id,sort_order")
    .maybeSingle()
  if (error) {
    if (error.code === '23505') throw new Error('Un plat avec ce nom existe déjà dans ce restaurant.')
    throw error
  }
  if (!data) return null
  return {
    id: data.id,
    name: data.name,
    price: data.price,
    currency: "F CFA",
    image: data.image?.path ?? "/placeholder.svg",
    video: data.video?.path ?? "",
    available: data.is_visible,
    categoryId: data.category_id ?? null,
    sortOrder: data.sort_order ?? 0,
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
  const { data, error } = await supabase
    .from("plate")
    .insert({
      restaurant_id: restaurantId,
      category_id: dishData.categoryId ?? null,
      name: dishData.name,
      price: dishData.price,
      image: { path: dishData.image },
      ...(dishData.video ? { video: { path: dishData.video } } : {}),
      is_visible: dishData.available,
      sort_order: dishData.sortOrder ?? 0,
    })
    .select("id,name,price,image,video,is_visible,category_id,sort_order")
    .single()
  if (error) {
    if (error.code === '23505') throw new Error('Un plat avec ce nom existe déjà dans ce restaurant.')
    throw error
  }
  return {
    id: data.id,
    name: data.name,
    price: data.price,
    currency: "F CFA",
    image: data.image?.path ?? "/placeholder.svg",
    video: data.video?.path ?? "",
    available: data.is_visible,
    categoryId: data.category_id ?? null,
    sortOrder: data.sort_order ?? 0,
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

/**
 * Get all categories for a restaurant, ordered by sort_order
 */
export async function getCategories(restaurantId: number): Promise<Category[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("category")
    .select("id,name,sort_order")
    .eq("restaurant_id", restaurantId)
    .order("sort_order")
  if (error) throw error
  return (data ?? []).map((c: any) => ({ id: c.id, name: c.name, sortOrder: c.sort_order }))
}

/**
 * Create a new category for a restaurant
 */
export async function createCategory(restaurantId: number, name: string): Promise<Category> {
  const supabase = getSupabase()
  const { data: existing } = await supabase
    .from("category")
    .select("sort_order")
    .eq("restaurant_id", restaurantId)
    .order("sort_order", { ascending: false })
    .limit(1)
  const nextOrder = ((existing?.[0]?.sort_order) ?? -1) + 1
  const { data, error } = await supabase
    .from("category")
    .insert({ restaurant_id: restaurantId, name, sort_order: nextOrder })
    .select("id,name,sort_order")
    .single()
  if (error) {
    if (error.code === '23505') throw new Error('Une catégorie avec ce nom existe déjà.')
    throw error
  }
  return { id: data.id, name: data.name, sortOrder: data.sort_order }
}

/**
 * Rename a category
 */
export async function renameCategory(categoryId: number, name: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from("category").update({ name }).eq("id", categoryId)
  if (error) {
    if (error.code === '23505') throw new Error('Une catégorie avec ce nom existe déjà.')
    throw error
  }
}

/**
 * Delete a category (dishes become uncategorized via ON DELETE SET NULL)
 */
export async function deleteCategory(categoryId: number): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from("category").delete().eq("id", categoryId)
  if (error) throw error
}

/**
 * Persist new sort_order values for a set of categories
 */
export async function reorderCategories(updates: Array<{ id: number; sortOrder: number }>): Promise<void> {
  const supabase = getSupabase()
  await Promise.all(
    updates.map(({ id, sortOrder }) =>
      supabase.from("category").update({ sort_order: sortOrder }).eq("id", id)
    )
  )
}

/**
 * Persist new sort_order values for a set of dishes
 */
export async function reorderDishes(updates: Array<{ id: number; sortOrder: number }>): Promise<void> {
  const supabase = getSupabase()
  await Promise.all(
    updates.map(({ id, sortOrder }) =>
      supabase.from("plate").update({ sort_order: sortOrder }).eq("id", id)
    )
  )
}

/**
 * Get all cuisines defined in the system (admin-managed list)
 */
export async function getAvailableCuisines(): Promise<{ id: number; name: string }[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("cuisine")
    .select("id,name")
    .order("name")
  if (error) throw error
  return (data ?? []).map((c: any) => ({ id: c.id, name: c.name }))
}

/**
 * Replace a restaurant's cuisine associations.
 * @param mainCuisineId  required main cuisine
 * @param subCuisineIds  optional sub-cuisines (max 3)
 */
export async function updateRestaurantCuisines(
  restaurantId: number,
  mainCuisineId: number,
  subCuisineIds: number[],
): Promise<void> {
  const supabase = getSupabase()
  await supabase.from("restaurant_cuisine").delete().eq("restaurant_id", restaurantId)

  const rows = [
    { restaurant_id: restaurantId, cuisine_id: mainCuisineId, is_main: true },
    ...subCuisineIds.map((cid) => ({
      restaurant_id: restaurantId,
      cuisine_id: cid,
      is_main: false,
    })),
  ]
  const { error } = await supabase.from("restaurant_cuisine").insert(rows)
  if (error) throw error
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
