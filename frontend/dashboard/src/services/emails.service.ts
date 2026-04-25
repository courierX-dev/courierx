import api from "./api"

export interface EmailDisplayCta {
  label: string
  url?: string
  action?: string
  args?: Record<string, unknown>
}

export interface EmailListItem {
  id: string
  from_email: string
  to_email: string
  subject: string
  status: string
  display_status: string
  display_message: string | null
  display_cta: EmailDisplayCta | null
  last_error: string | null
  provider_message_id: string | null
  tags: string[]
  queued_at: string | null
  sent_at: string | null
  delivered_at: string | null
  created_at: string
}

export interface EmailEvent {
  id: string
  event_type: string
  occurred_at: string
  provider: string | null
  bounce_type: string | null
  bounce_code: string | null
  link_url: string | null
}

export interface EmailDetail extends EmailListItem {
  html_body: string | null
  text_body: string | null
  reply_to: string | null
  metadata: Record<string, unknown> | null
  events: EmailEvent[]
}

export interface ListEmailsParams {
  page?: number
  per_page?: number
  status?: string
  recipient?: string
  from?: string
  to?: string
}

export interface SendEmailParams {
  to: string
  from?: string
  subject: string
  html_body?: string
  text_body?: string
}

export const emailsService = {
  async list(params: ListEmailsParams = {}): Promise<EmailListItem[]> {
    const { data } = await api.get<EmailListItem[]>("/api/v1/emails", { params })
    return data
  },

  async get(id: string): Promise<EmailDetail> {
    const { data } = await api.get<EmailDetail>(`/api/v1/emails/${id}`)
    return data
  },

  async send(params: SendEmailParams): Promise<EmailListItem> {
    const { data } = await api.post<EmailListItem>("/api/v1/emails", params)
    return data
  },
}
