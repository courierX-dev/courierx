import api from "./api"

export interface EmailListItem {
  id: string
  from_email: string
  to_email: string
  subject: string
  status: string
  provider_message_id: string | null
  tags: string[]
  queued_at: string | null
  sent_at: string | null
  delivered_at: string | null
  created_at: string
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

  async get(id: string): Promise<EmailListItem> {
    const { data } = await api.get<EmailListItem>(`/api/v1/emails/${id}`)
    return data
  },

  async send(params: SendEmailParams): Promise<EmailListItem> {
    const { data } = await api.post<EmailListItem>("/api/v1/emails", params)
    return data
  },
}
