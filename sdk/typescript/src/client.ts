import type { CourierXOptions, CourierXErrorResponse } from "./types"
import { CourierXError, AuthenticationError, RateLimitError } from "./errors"

const DEFAULT_BASE_URL = "https://api.courierx.dev"
const DEFAULT_TIMEOUT = 30_000
const USER_AGENT = "@courierx/node"

export class HttpClient {
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly timeout: number

  constructor(options: CourierXOptions) {
    if (!options.apiKey) {
      throw new AuthenticationError(
        "API key is required. Pass it as { apiKey: 'cxk_live_...' }"
      )
    }
    this.apiKey = options.apiKey
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "")
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT
  }

  async request<T>(method: string, path: string, body?: unknown, params?: Record<string, string>): Promise<T> {
    const url = new URL(path, this.baseUrl)
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== "") {
          url.searchParams.set(key, value)
        }
      }
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url.toString(), {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "User-Agent": USER_AGENT,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as CourierXErrorResponse
        if (response.status === 401) {
          throw new AuthenticationError(errorBody.error)
        }
        if (response.status === 429) {
          throw new RateLimitError(errorBody.error)
        }
        throw CourierXError.fromResponse(response.status, errorBody)
      }

      if (response.status === 204) {
        return undefined as T
      }

      return (await response.json()) as T
    } catch (error) {
      if (error instanceof CourierXError) throw error
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new CourierXError("Request timed out", 408)
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  get<T>(path: string, params?: Record<string, string>): Promise<T> {
    return this.request<T>("GET", path, undefined, params)
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", path, body)
  }

  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PATCH", path, body)
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>("DELETE", path)
  }
}
