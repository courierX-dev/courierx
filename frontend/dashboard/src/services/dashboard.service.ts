import api from "./api"

export type Period = "7d" | "30d" | "90d"

export interface DailyStats {
  date: string
  sent: number
  delivered: number
  bounced: number
  opened: number
}

export interface ProviderHealth {
  id: string
  provider: string
  display_name: string
  status: string
  success_rate: number | null
  avg_latency_ms: number | null
}

export interface DashboardMetrics {
  period: { from: string; to: string }
  totals: {
    sent: number
    delivered: number
    bounced: number
    complained: number
    failed: number
    opened: number
    clicked: number
  }
  rates: {
    delivery_rate: number
    open_rate: number
  }
  daily: DailyStats[]
  providers: ProviderHealth[]
}

export const dashboardService = {
  async getMetrics(period: Period = "7d"): Promise<DashboardMetrics> {
    const { data } = await api.get<DashboardMetrics>("/api/v1/dashboard/metrics", {
      params: { period },
    })
    return data
  },
}
