export type UserRole = "super_admin" | "admin" | "restaurateur" | "client"

export interface Profile {
  id: number
  user_id: string
  first_name: string
  last_name: string
  email: string
  role: UserRole
  is_active: boolean
  must_change_password: boolean
  invited_at: string | null
  confirmed_at: string | null
  created_at: string
  updated_at: string
}
