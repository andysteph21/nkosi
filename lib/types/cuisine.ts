export interface Cuisine {
  id: number
  name: string
  created_at: string
  updated_at: string
}

export interface RestaurantCuisine {
  restaurant_id: number
  cuisine_id: number
  is_main: boolean
}
