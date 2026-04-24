import api from "./api"

export interface Suppression {
  id: string
  email: string
  reason: string
  note: string | null
  source_email_id: string | null
  created_at: string
}

export interface CreateSuppressionRequest {
  email: string
  reason: string
  note?: string
}

export const suppressionsService = {
  async list(params: { reason?: string } = {}): Promise<Suppression[]> {
    const { data } = await api.get<Suppression[]>("/api/v1/suppressions", { params })
    return data
  },

  async create(params: CreateSuppressionRequest): Promise<Suppression> {
    const { data } = await api.post<Suppression>("/api/v1/suppressions", params)
    return data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/api/v1/suppressions/${id}`)
  },
}
