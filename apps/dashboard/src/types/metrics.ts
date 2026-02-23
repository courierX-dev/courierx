export type MessageStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "bounced"
  | "failed"
  | "opened"
  | "clicked"

export interface DashboardMetrics {
  total_sent: number
  delivered: number
  bounced: number
  failed: number
  open_rate: number
  click_rate: number
  delivery_rate: number
  period_days: number
}

export interface DailyStats {
  date: string
  sent: number
  delivered: number
  bounced: number
  opened: number
}

export interface Message {
  id: string
  recipient_email: string
  subject: string
  status: MessageStatus
  provider: string
  created_at: string
  delivered_at?: string
  opened_at?: string
  clicked_at?: string
}
