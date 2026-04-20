"use client"

import { usePrefetchDashboard } from "@/hooks/use-prefetch-dashboard"

export function DashboardPrefetch({ children }: { children: React.ReactNode }) {
  usePrefetchDashboard()
  return <>{children}</>
}
