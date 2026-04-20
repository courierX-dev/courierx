"use client"

import { useState } from "react"
import { VolumeChart } from "@/components/dashboard/volume-chart"
import { PageShell } from "@/components/dashboard/page-shell"
import { PageHeader } from "@/components/dashboard/page-header"
import { InlineError } from "@/components/dashboard/inline-error"
import { AnimatedNumber } from "@/components/dashboard/animated-number"
import { DotIndicator } from "@/components/ui/dot-indicator"
import { cn } from "@/lib/utils"
import { useDashboardMetrics } from "@/hooks/use-dashboard"
import type { Period } from "@/services/dashboard.service"

const RANGES: Period[] = ["7d", "30d", "90d"]

export default function AnalyticsPage() {
  const [range, setRange] = useState<Period>("7d")
  const { data: metrics, isLoading, isError, refetch } = useDashboardMetrics(range)

  const chartData = metrics?.daily.map((d) => ({
    date: new Date(d.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    sent:      d.sent,
    delivered: d.delivered,
    bounced:   d.bounced,
  })) ?? []

  const avgDeliveryRate = metrics && metrics.totals.sent > 0
    ? metrics.rates.delivery_rate
    : 0

  return (
    <PageShell>
      <PageHeader title="Analytics" subtitle="Delivery performance metrics">
        <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5 bg-muted/30">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "px-3 py-1 rounded text-xs font-medium transition-colors",
                range === r
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </PageHeader>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Total Sent",    value: (metrics?.totals.sent ?? 0).toLocaleString() },
          { label: "Delivered",     value: (metrics?.totals.delivered ?? 0).toLocaleString() },
          { label: "Bounced",       value: (metrics?.totals.bounced ?? 0).toLocaleString() },
          { label: "Open Rate",     value: `${metrics?.rates.open_rate ?? 0}%` },
          { label: "Delivery Rate", value: `${metrics?.rates.delivery_rate ?? 0}%` },
        ].map((s) => (
          <div key={s.label} className={cn("rounded-lg border border-border bg-card p-3", isLoading && "animate-pulse")}>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</p>
            <p className="mt-1 text-xl font-bold font-mono tabular-nums">
              {isLoading ? <span className="invisible">0</span> : isError ? "—" : <AnimatedNumber value={s.value} />}
            </p>
          </div>
        ))}
      </div>

      {/* Volume chart */}
      <div className="rounded-lg border border-border bg-card px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-medium text-muted-foreground">Volume over time</p>
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-chart-1 inline-block" />sent
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-chart-2 inline-block" />delivered
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-chart-4 inline-block" />bounced
            </span>
          </div>
        </div>
        {isLoading ? (
          <div className="h-50 rounded bg-muted animate-pulse" />
        ) : isError ? (
          <InlineError message="Could not load chart data" onRetry={refetch} />
        ) : chartData.length > 0 ? (
          <VolumeChart data={chartData} />
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">No data for this period</p>
        )}
      </div>

      {/* Provider breakdown */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border bg-muted/20">
          <p className="text-xs font-medium">Provider breakdown</p>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Provider</th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Status</th>
              <th className="px-4 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Success rate</th>
              <th className="px-4 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Avg latency</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-4 py-6" aria-busy="true">
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-8 rounded bg-muted animate-pulse" />
                    ))}
                  </div>
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={4}>
                  <InlineError message="Could not load provider data" onRetry={refetch} />
                </td>
              </tr>
            ) : !metrics?.providers.length ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-muted-foreground">No providers configured.</td>
              </tr>
            ) : (
              metrics.providers.map((p, i) => (
                <tr
                  key={p.id}
                  className={cn("hover:bg-muted/20 transition-colors", i < metrics.providers.length - 1 && "border-b border-border/50")}
                >
                  <td className="px-4 py-2.5 text-sm font-medium">{p.display_name ?? p.provider}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <DotIndicator status={p.status} />
                      <span className="text-xs text-muted-foreground capitalize">{p.status}</span>
                    </div>
                  </td>
                  <td className={cn(
                    "px-4 py-2.5 text-right font-mono text-sm",
                    p.success_rate == null ? "text-muted-foreground"
                      : p.success_rate >= 99 ? "text-success"
                      : p.success_rate >= 97 ? "text-warning"
                      : "text-destructive",
                  )}>
                    {p.success_rate != null ? `${p.success_rate}%` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-sm text-muted-foreground">
                    {p.avg_latency_ms != null ? `${p.avg_latency_ms}ms` : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Daily delivery rate bars */}
      {chartData.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground mb-4">Daily delivery rate</p>
          <div className="flex items-end gap-1.5 h-16">
            {chartData.map((d) => {
              const rate = d.sent > 0 ? (d.delivered / d.sent) * 100 : 0
              const height = Math.max(5, ((rate - 97) / 3) * 100)
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-sm bg-success/70 transition-all"
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-[9px] font-mono text-muted-foreground whitespace-nowrap">
                    {d.date.slice(4)}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
            <span>97.0%</span>
            <span><AnimatedNumber value={`${avgDeliveryRate}%`} /> avg</span>
            <span>100%</span>
          </div>
        </div>
      )}
    </PageShell>
  )
}
