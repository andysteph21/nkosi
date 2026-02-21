export type VisibilityRequestStatus = "pending" | "approved" | "refused"

export interface VisibilityRequest {
  id: number
  restaurant_id: number
  status: VisibilityRequestStatus
  refusal_message: string | null
  reviewed_by: number | null
  created_at: string
  updated_at: string
}
