import axios from "axios"

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
  headers: { "Content-Type": "application/json" },
})

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("auth_token")
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      // Avoid circular import — clear directly
      localStorage.removeItem("auth_token")
      localStorage.removeItem("auth_tenant")
      document.cookie = "auth_token=; path=/; max-age=0; samesite=strict"
      window.location.href = "/login"
    }
    return Promise.reject(error)
  }
)

export default api
