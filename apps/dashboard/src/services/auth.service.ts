import api from "./api"
import type { LoginRequest, RegisterRequest, AuthResponse, Tenant } from "@/types/auth"

function setAuthCookie(token: string) {
  document.cookie = `auth_token=${token}; path=/; max-age=86400; samesite=strict`
}

function clearAuthCookie() {
  document.cookie = "auth_token=; path=/; max-age=0; samesite=strict"
}

function storeTenant(tenant: Tenant) {
  localStorage.setItem("auth_tenant", JSON.stringify(tenant))
}

export const authService = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>("/api/v1/auth/login", data)
    const { token, tenant } = res.data
    localStorage.setItem("auth_token", token)
    setAuthCookie(token)
    storeTenant(tenant)
    return res.data
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>("/api/v1/auth/register", data)
    const { token, tenant } = res.data
    localStorage.setItem("auth_token", token)
    setAuthCookie(token)
    storeTenant(tenant)
    return res.data
  },

  logout(): void {
    localStorage.removeItem("auth_token")
    localStorage.removeItem("auth_tenant")
    clearAuthCookie()
    window.location.href = "/login"
  },

  getCachedTenant(): Tenant | null {
    if (typeof window === "undefined") return null
    const raw = localStorage.getItem("auth_tenant")
    return raw ? (JSON.parse(raw) as Tenant) : null
  },

  async getCurrentUser(): Promise<Tenant> {
    const res = await api.get<{ tenant: Tenant }>("/api/v1/auth/me")
    storeTenant(res.data.tenant)
    return res.data.tenant
  },

  async updateName(name: string): Promise<Tenant> {
    const res = await api.patch<{ tenant: Tenant }>("/api/v1/auth/me", { name })
    storeTenant(res.data.tenant)
    return res.data.tenant
  },
}
