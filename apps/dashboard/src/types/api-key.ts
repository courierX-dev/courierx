export interface ApiKey {
  id: string
  name: string
  prefix: string
  last_used_at?: string
  expires_at?: string
  status: "active" | "revoked"
  created_at: string
}

export interface CreateApiKeyRequest {
  name: string
  expires_at?: string
}

export interface CreatedApiKey extends ApiKey {
  full_key: string
}
