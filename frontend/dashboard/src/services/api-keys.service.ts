import api from "./api"

export interface ApiKey {
  id: string
  name: string
  key_prefix: string
  status: "active" | "revoked" | "expired"
  scopes: string[]
  last_used_at: string | null
  expires_at: string | null
  created_at: string
}

export interface CreatedApiKey extends ApiKey {
  raw_key: string
}

export interface CreateApiKeyRequest {
  name: string
  scopes?: string[]
}

export const apiKeysService = {
  async list(): Promise<ApiKey[]> {
    const { data } = await api.get<ApiKey[]>("/api/v1/api_keys")
    return data
  },

  async create(params: CreateApiKeyRequest): Promise<CreatedApiKey> {
    const { data } = await api.post<CreatedApiKey>("/api/v1/api_keys", params)
    return data
  },

  async revoke(id: string): Promise<ApiKey> {
    const { data } = await api.patch<ApiKey>(`/api/v1/api_keys/${id}/revoke`)
    return data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/api/v1/api_keys/${id}`)
  },
}
