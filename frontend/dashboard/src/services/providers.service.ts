import api from "./api"

export type WebhookStatus =
  | "not_configured"
  | "auto"
  | "manual"
  | "needs_signing_key"
  | "failed"
  | "revoked"

export interface ProviderWebhookSummary {
  status: WebhookStatus
  auto_managed: boolean
  url: string | null
  external_id: string | null
  secret_present: boolean
  last_error: string | null
  last_synced_at: string | null
  supports_auto: boolean
}

export interface ProviderConnection {
  id: string
  provider: string
  mode: string
  status: string
  display_name: string | null
  weight: number
  priority: number
  success_rate: number | null
  avg_latency_ms: number | null
  consecutive_failures: number
  last_health_check_at: string | null
  region: string | null
  smtp_host: string | null
  smtp_port: number | null
  created_at: string
  webhook?: ProviderWebhookSummary | null
  /** @deprecated use webhook.url */
  webhook_url?: string | null
  /** @deprecated use webhook.secret_present */
  webhook_secret_present?: boolean
  verification?: {
    verified: boolean
    error?: string
  }
}

export interface RoutingRule {
  id: string
  name: string
  strategy: string
  is_default: boolean
  is_active: boolean
  match_from_domain: string | null
  match_tag: string | null
  created_at: string
}

export interface CreateProviderConnectionRequest {
  provider: string
  display_name?: string
  priority?: number
  mode?: string
  weight?: number
  api_key?: string
  secret?: string
  smtp_host?: string
  smtp_port?: number
  region?: string
}

export const providersService = {
  async listConnections(): Promise<ProviderConnection[]> {
    const { data } = await api.get<ProviderConnection[]>("/api/v1/provider_connections")
    return data
  },

  async createConnection(payload: CreateProviderConnectionRequest): Promise<ProviderConnection> {
    const { data } = await api.post<ProviderConnection>("/api/v1/provider_connections", payload)
    return data
  },

  async verifyConnection(id: string): Promise<ProviderConnection> {
    const { data } = await api.post<ProviderConnection>(`/api/v1/provider_connections/${id}/verify`)
    return data
  },

  async deleteConnection(id: string): Promise<void> {
    await api.delete(`/api/v1/provider_connections/${id}`)
  },

  async setConnectionStatus(id: string, status: "active" | "inactive"): Promise<ProviderConnection> {
    const { data } = await api.patch<ProviderConnection>(`/api/v1/provider_connections/${id}`, { status })
    return data
  },

  async updateConnection(
    id: string,
    payload: Partial<{
      display_name: string
      priority: number
      weight: number
      mode: string
      api_key: string
      secret: string
      webhook_secret: string
      webhook_auto_managed: boolean
    }>,
  ): Promise<ProviderConnection> {
    const { data } = await api.patch<ProviderConnection>(`/api/v1/provider_connections/${id}`, payload)
    return data
  },

  async resyncWebhook(id: string): Promise<ProviderConnection> {
    const { data } = await api.post<ProviderConnection>(
      `/api/v1/provider_connections/${id}/resync_webhook`,
    )
    return data
  },

  async listRules(): Promise<RoutingRule[]> {
    const { data } = await api.get<RoutingRule[]>("/api/v1/routing_rules")
    return data
  },

  async createRule(payload: {
    name: string
    strategy: string
    is_default?: boolean
    is_active?: boolean
    match_from_domain?: string
    match_tag?: string
  }): Promise<RoutingRule> {
    const { data } = await api.post<RoutingRule>("/api/v1/routing_rules", payload)
    return data
  },

  async deleteRule(id: string): Promise<void> {
    await api.delete(`/api/v1/routing_rules/${id}`)
  },
}
