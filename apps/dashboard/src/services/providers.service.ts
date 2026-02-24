import api from "./api"

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
  created_at: string
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

export const providersService = {
  async listConnections(): Promise<ProviderConnection[]> {
    const { data } = await api.get<ProviderConnection[]>("/api/v1/provider_connections")
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
