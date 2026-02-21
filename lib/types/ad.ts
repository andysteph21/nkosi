export type AdMediaType = "image" | "video"

export interface Ad {
  id: number
  media_url: string
  media_type: AdMediaType
  is_active: boolean
  end_date: string | null
  sort_order: number
  created_by: number | null
  created_at: string
  updated_at: string
}
