import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { dashboardService } from "@/services/dashboard.service"
import { emailsService } from "@/services/emails.service"
import type { Period } from "@/services/dashboard.service"

const PERIODS: Period[] = ["7d", "30d", "90d"]
const METRICS_STALE = 5 * 60 * 1000
const EMAILS_STALE = 30 * 1000

export function usePrefetchDashboard() {
  const qc = useQueryClient()

  useEffect(() => {
    for (const period of PERIODS) {
      qc.prefetchQuery({
        queryKey: ["dashboard", "metrics", period],
        queryFn: () => dashboardService.getMetrics(period),
        staleTime: METRICS_STALE,
      })
    }

    // Pre-warm overview email list so campaign table is instant
    qc.prefetchQuery({
      queryKey: ["emails", { per_page: 10 }],
      queryFn: () => emailsService.list({ per_page: 10 }),
      staleTime: EMAILS_STALE,
    })
  }, [qc])
}
