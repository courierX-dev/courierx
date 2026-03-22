import api from "./api"

export interface Domain {
  id: string
  domain: string
  status: string
  verification_token: string | null
  verified_at: string | null
  spf_record: string | null
  dkim_selector: string | null
  created_at: string
}

export const domainsService = {
  async list(): Promise<Domain[]> {
    const { data } = await api.get<Domain[]>("/api/v1/domains")
    return data
  },

  async create(domain: string): Promise<Domain> {
    const { data } = await api.post<Domain>("/api/v1/domains", { domain })
    return data
  },

  async verify(id: string): Promise<Domain> {
    const { data } = await api.post<Domain>(`/api/v1/domains/${id}/verify`)
    return data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/api/v1/domains/${id}`)
  },
}
