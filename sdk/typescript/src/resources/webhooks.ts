import type { HttpClient } from "../client"
import type { WebhookEndpoint, CreateWebhookParams, UpdateWebhookParams } from "../types"

export class Webhooks {
  constructor(private readonly client: HttpClient) {}

  /**
   * List all registered webhook endpoints.
   *
   * @example
   * ```ts
   * const endpoints = await courierx.webhooks.list()
   * ```
   */
  async list(): Promise<WebhookEndpoint[]> {
    return this.client.get<WebhookEndpoint[]>("/api/v1/webhook_endpoints")
  }

  /**
   * Get a single webhook endpoint by ID.
   *
   * @example
   * ```ts
   * const endpoint = await courierx.webhooks.get("endpoint-uuid")
   * ```
   */
  async get(id: string): Promise<WebhookEndpoint> {
    return this.client.get<WebhookEndpoint>(`/api/v1/webhook_endpoints/${id}`)
  }

  /**
   * Register a new webhook endpoint.
   *
   * @example
   * ```ts
   * const endpoint = await courierx.webhooks.create({
   *   url: "https://yourapp.com/webhooks/email",
   *   events: ["email.delivered", "email.bounced"],
   * })
   * ```
   */
  async create(params: CreateWebhookParams): Promise<WebhookEndpoint> {
    return this.client.post<WebhookEndpoint>("/api/v1/webhook_endpoints", {
      url: params.url,
      events: params.events,
      enabled: params.enabled ?? true,
    })
  }

  /**
   * Update an existing webhook endpoint.
   *
   * @example
   * ```ts
   * await courierx.webhooks.update("endpoint-uuid", { enabled: false })
   * ```
   */
  async update(id: string, params: UpdateWebhookParams): Promise<WebhookEndpoint> {
    return this.client.patch<WebhookEndpoint>(`/api/v1/webhook_endpoints/${id}`, params)
  }

  /**
   * Delete a webhook endpoint.
   *
   * @example
   * ```ts
   * await courierx.webhooks.delete("endpoint-uuid")
   * ```
   */
  async delete(id: string): Promise<void> {
    return this.client.delete(`/api/v1/webhook_endpoints/${id}`)
  }
}
