import type { HttpClient } from "../client"
import type { Suppression, CreateSuppressionParams, ListSuppressionsParams } from "../types"

export class Suppressions {
  constructor(private readonly client: HttpClient) {}

  /**
   * List suppressed email addresses.
   *
   * @example
   * ```ts
   * const list = await courierx.suppressions.list({ reason: "bounce" })
   * ```
   */
  async list(params?: ListSuppressionsParams): Promise<Suppression[]> {
    const query: Record<string, string> = {}
    if (params?.email) query.email = params.email
    if (params?.reason) query.reason = params.reason
    if (params?.page) query.page = String(params.page)
    if (params?.perPage) query.per_page = String(params.perPage)
    return this.client.get<Suppression[]>("/api/v1/suppressions", query)
  }

  /**
   * Manually suppress an email address.
   *
   * @example
   * ```ts
   * await courierx.suppressions.create({ email: "user@example.com", reason: "unsubscribe" })
   * ```
   */
  async create(params: CreateSuppressionParams): Promise<Suppression> {
    return this.client.post<Suppression>("/api/v1/suppressions", {
      email: params.email,
      reason: params.reason ?? "manual",
    })
  }

  /**
   * Remove a suppression to allow sending to that address again.
   *
   * @example
   * ```ts
   * await courierx.suppressions.delete("suppression-uuid")
   * ```
   */
  async delete(id: string): Promise<void> {
    return this.client.delete(`/api/v1/suppressions/${id}`)
  }
}
