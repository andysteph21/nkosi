export interface Notification {
  id: number
  profile_id: number
  type: string
  title: string
  message: string
  is_read: boolean
  metadata: Record<string, unknown> | null
  created_at: string
}
