export interface RestaurantImage {
  path: string
  fullPath?: string
}

export interface RestaurantSchedule {
  id: number
  restaurant_id: number
  day_of_week: string
  is_closed: boolean
  open_time: string | null
  close_time: string | null
}

export interface Restaurant {
  id: number
  profile_id: number
  name: string
  description: string | null
  city: string
  neighborhood: string
  address: string
  logo: RestaurantImage | null
  cover: RestaurantImage | null
  is_restricted: boolean
  is_visible: boolean
  view_count: number
  like_count: number
  click_count: number
  created_at: string
  updated_at: string
}
