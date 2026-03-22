import { create } from "zustand"
import type { Tenant } from "@/types/auth"

function setAuthCookie(token: string) {
  document.cookie = `auth_token=${token}; path=/; max-age=86400; samesite=strict`
}

function clearAuthCookie() {
  document.cookie = "auth_token=; path=/; max-age=0; samesite=strict"
}

interface AuthState {
  token: string | null
  tenant: Tenant | null
  hydrated: boolean
  setSession: (token: string, tenant: Tenant) => void
  setTenant: (tenant: Tenant) => void
  logout: () => void
  hydrate: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  tenant: null,
  hydrated: false,

  setSession: (token, tenant) => {
    localStorage.setItem("auth_token", token)
    localStorage.setItem("auth_tenant", JSON.stringify(tenant))
    setAuthCookie(token)
    set({ token, tenant })
  },

  setTenant: (tenant) => {
    localStorage.setItem("auth_tenant", JSON.stringify(tenant))
    set({ tenant })
  },

  logout: () => {
    localStorage.removeItem("auth_token")
    localStorage.removeItem("auth_tenant")
    clearAuthCookie()
    set({ token: null, tenant: null })
    window.location.href = "/login"
  },

  hydrate: () => {
    if (typeof window === "undefined") return
    const token = localStorage.getItem("auth_token")
    const raw = localStorage.getItem("auth_tenant")
    const tenant = raw ? (JSON.parse(raw) as Tenant) : null
    set({ token, tenant, hydrated: true })
  },
}))
