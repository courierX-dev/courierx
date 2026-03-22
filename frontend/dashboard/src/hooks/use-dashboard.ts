import { useQuery } from "@tanstack/react-query"
import { dashboardService } from "@/services/dashboard.service"
import type { Period } from "@/services/dashboard.service"

export function useDashboardMetrics(period: Period = "7d") {
  return useQuery({
    queryKey: ["dashboard", "metrics", period],
    queryFn: () => dashboardService.getMetrics(period),
  })
}
