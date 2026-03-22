export type ProjectMode = "demo" | "byok" | "managed"

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  name: string
  password: string
  password_confirmation?: string
  mode?: "demo" | "byok" | "managed"
}

export interface Tenant {
  id: string
  name: string
  slug: string
  email: string
  mode: string
  status: string
  plan_id: string | null
  settings: Record<string, unknown>
  created_at: string
}

export interface AuthResponse {
  tenant: Tenant
  token: string
}
