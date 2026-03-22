import api from "./api"
import type { LoginRequest, RegisterRequest, AuthResponse, Tenant } from "@/types/auth"
import { useAuthStore } from "@/stores/auth.store"

export const authService = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>("/api/v1/auth/login", data)
    const { token, tenant } = res.data
    useAuthStore.getState().setSession(token, tenant)
    return res.data
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>("/api/v1/auth/register", data)
    const { token, tenant } = res.data
    useAuthStore.getState().setSession(token, tenant)
    return res.data
  },

  logout(): void {
    useAuthStore.getState().logout()
  },

  async getCurrentUser(): Promise<Tenant> {
    const res = await api.get<{ tenant: Tenant }>("/api/v1/auth/me")
    useAuthStore.getState().setTenant(res.data.tenant)
    return res.data.tenant
  },

  async updateName(name: string): Promise<Tenant> {
    const res = await api.patch<{ tenant: Tenant }>("/api/v1/auth/me", { name })
    useAuthStore.getState().setTenant(res.data.tenant)
    return res.data.tenant
  },
}
