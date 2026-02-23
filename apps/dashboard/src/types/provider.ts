export type ProviderType =
  | "sendgrid"
  | "mailgun"
  | "ses"
  | "smtp"
  | "postmark"
  | "resend"

export interface ProviderAccount {
  id: string
  name: string
  type: ProviderType
  status: "active" | "inactive" | "error"
  priority: number
  role: "primary" | "secondary" | "tertiary"
  daily_sent?: number
  daily_limit?: number
  last_error?: string
  created_at: string
}
