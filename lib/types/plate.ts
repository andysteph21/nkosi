export interface Category {
  id: number
  restaurant_id: number
  name: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface PlateMedia {
  path: string
  fullPath?: string
}

export interface Plate {
  id: number
  restaurant_id: number
  category_id: number | null
  name: string
  price: number
  image: PlateMedia
  video: PlateMedia | null
  is_visible: boolean
  created_at: string
  updated_at: string
}
