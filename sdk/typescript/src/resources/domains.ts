import type { HttpClient } from "../client"
import type { Domain } from "../types"

export class Domains {
  constructor(private readonly client: HttpClient) {}

  /** List all sending domains. */
  async list(): Promise<Domain[]> {
    return this.client.get<Domain[]>("/api/v1/domains")
  }

  /** Add a sending domain. */
  async create(domain: string): Promise<Domain> {
    return this.client.post<Domain>("/api/v1/domains", { domain })
  }

  /** Trigger DNS verification for a domain. */
  async verify(id: string): Promise<Domain> {
    return this.client.post<Domain>(`/api/v1/domains/${id}/verify`)
  }

  /** Remove a sending domain. */
  async delete(id: string): Promise<void> {
    return this.client.delete(`/api/v1/domains/${id}`)
  }
}
