import api from "./api"
import type { LoginRequest, RegisterRequest, AuthResponse } from "@/types/auth"

export const authService = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>("/api/v1/auth/login", data)
    localStorage.setItem("auth_token", res.data.token)
    return res.data
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>("/api/v1/auth/register", data)
    localStorage.setItem("auth_token", res.data.token)
    return res.data
  },

  async logout(): Promise<void> {
    try {
      await api.post("/api/v1/auth/logout")
    } finally {
      localStorage.removeItem("auth_token")
      window.location.href = "/login"
    }
  },

  async getCurrentUser(): Promise<AuthResponse> {
    const res = await api.get<AuthResponse>("/api/v1/auth/me")
    return res.data
  },
}
