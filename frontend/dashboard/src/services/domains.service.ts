import api from "./api"

export interface DnsRecord {
  type: "TXT" | "CNAME" | "MX" | string
  name: string
  value: string
  ttl?: number
  // True when the contributing source (ownership token or any provider DPV
  // for this record) is verified. Used to render a check next to the record.
  verified?: boolean
}

export interface DomainProviderVerification {
  provider_connection_id: string
  provider: "sendgrid" | "mailgun" | "aws_ses" | "resend" | "postmark" | "smtp" | string
  display_name: string | null
  priority: number | null
  status: "pending" | "verified" | "failed" | string
  verified_at: string | null
  last_checked_at: string | null
  error: string | null
  external_domain_id: string | null
}

export interface Domain {
  id: string
  domain: string
  status: string
  verification_token: string | null
  verified_at: string | null
  spf_record: string | null
  dkim_selector: string | null
  created_at: string
  // Merged DNS bundle: ownership token + every connected provider's required
  // records, deduplicated. Render this — don't hardcode per-record fields.
  dns_records: DnsRecord[]
  // One entry per (domain × provider connection). Multi-account-aware:
  // distinct rows for "Resend (Production)" and "Resend (Marketing)".
  providers: DomainProviderVerification[]
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

  // Re-poll every per-provider verification for this domain. Used after the
  // user adds DNS records at their registrar — saves them waiting for the
  // 15-minute background poll cycle.
  async recheck(id: string): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>(`/api/v1/domains/${id}/recheck`)
    return data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/api/v1/domains/${id}`)
  },
}
