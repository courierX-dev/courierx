export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  first_name: string
  last_name: string
  tenant_name: string
}

export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  role: "owner" | "admin" | "developer" | "viewer"
}

export interface Tenant {
  id: string
  name: string
  slug: string
  plan: string
}

export interface AuthResponse {
  user: User
  tenant: Tenant
  token: string
}
