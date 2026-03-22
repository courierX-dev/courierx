export type MessageStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "bounced"
  | "failed"
  | "opened"
  | "clicked"

export type { DashboardMetrics, DailyStats, ProviderHealth, Period } from "@/services/dashboard.service"
