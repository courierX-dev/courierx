import api from "./api"

export const WEBHOOK_EVENTS = [
  "email.delivered",
  "email.bounced",
  "email.complained",
  "email.opened",
  "email.clicked",
  "email.failed",
  "email.queued",
]

export interface WebhookEndpoint {
  id: string
  url: string
  description: string | null
  is_active: boolean
  events: string[]
  created_at: string
}

export const webhooksService = {
  async list(): Promise<WebhookEndpoint[]> {
    const { data } = await api.get<WebhookEndpoint[]>("/api/v1/webhook_endpoints")
    return data
  },

  async create(payload: { url: string; description?: string; events: string[] }): Promise<WebhookEndpoint> {
    const { data } = await api.post<WebhookEndpoint>("/api/v1/webhook_endpoints", payload)
    return data
  },

  async update(id: string, payload: Partial<{ url: string; description: string; is_active: boolean; events: string[] }>): Promise<WebhookEndpoint> {
    const { data } = await api.patch<WebhookEndpoint>(`/api/v1/webhook_endpoints/${id}`, payload)
    return data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/api/v1/webhook_endpoints/${id}`)
  },
}
