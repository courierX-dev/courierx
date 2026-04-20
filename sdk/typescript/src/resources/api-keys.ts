import type { HttpClient } from "../client"
import type { ApiKey } from "../types"

export class ApiKeys {
  constructor(private readonly client: HttpClient) {}

  /** List all API keys (keys are masked). */
  async list(): Promise<ApiKey[]> {
    return this.client.get<ApiKey[]>("/api/v1/api_keys")
  }

  /** Create a new API key. The full key is only returned once. */
  async create(name: string): Promise<ApiKey> {
    return this.client.post<ApiKey>("/api/v1/api_keys", { name })
  }

  /** Revoke an API key. */
  async revoke(id: string): Promise<void> {
    return this.client.delete(`/api/v1/api_keys/${id}`)
  }
}
