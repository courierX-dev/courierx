"use client"

import { useEffect, useState } from "react"
import { ArrowUpRight, ArrowDownRight } from "lucide-react"
import { VolumeChart } from "@/components/dashboard/volume-chart"
import { DotIndicator } from "@/components/ui/dot-indicator"
import { cn } from "@/lib/utils"
import { dashboardService, type DashboardMetrics } from "@/services/dashboard.service"
import { emailsService, type EmailListItem } from "@/services/emails.service"

const STATUS_COLOR: Record<string, string> = {
  delivered:  "text-success",
  opened:     "text-sky-500 dark:text-sky-400",
  clicked:    "text-violet-500 dark:text-violet-400",
  bounced:    "text-destructive",
  failed:     "text-destructive",
  complained: "text-destructive",
  suppressed: "text-muted-foreground",
  queued:     "text-muted-foreground",
  sent:       "text-primary",
}

function MetricCard({
  label,
  value,
  unit,
  change,
}: {
  label: string
  value: string
  unit?: string
  change?: number
}) {
  const positive = change !== undefined && change > 0
  const negative = change !== undefined && change < 0
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-2xl font-bold font-mono tabular-nums tracking-tight leading-none">
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>}
      </p>
      {change !== undefined && (
        <p className={cn(
          "mt-1.5 text-xs flex items-center gap-0.5",
          positive ? "text-success" : negative ? "text-destructive" : "text-muted-foreground",
        )}>
          {positive ? <ArrowUpRight className="h-3 w-3" /> : negative ? <ArrowDownRight className="h-3 w-3" /> : null}
          {Math.abs(change)}% vs. yesterday
        </p>
      )}
    </div>
  )
}

function MetricSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-4 animate-pulse">
      <div className="h-3 w-20 rounded bg-muted" />
      <div className="mt-2 h-7 w-24 rounded bg-muted" />
    </div>
  )
}

export default function OverviewPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [emails, setEmails]   = useState<EmailListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      dashboardService.getMetrics("7d"),
      emailsService.list({ per_page: 5 }),
    ])
      .then(([m, e]) => { setMetrics(m); setEmails(e) })
      .finally(() => setLoading(false))
  }, [])

  const bounceRate = metrics && metrics.totals.sent > 0
    ? ((metrics.totals.bounced / metrics.totals.sent) * 100).toFixed(2)
    : "0.00"

  const chartData = metrics?.daily.map((d) => ({
    date: new Date(d.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    sent:      d.sent,
    delivered: d.delivered,
    bounced:   d.bounced,
  })) ?? []

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-base font-semibold tracking-tight">Overview</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">Last 7 days · Production</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <MetricSkeleton key={i} />)
        ) : (
          <>
            <MetricCard label="Sent (7d)"      value={(metrics?.totals.sent ?? 0).toLocaleString()} />
            <MetricCard label="Delivery Rate"  value={String(metrics?.rates.delivery_rate ?? 0)} unit="%" />
            <MetricCard label="Bounce Rate"    value={bounceRate} unit="%" />
            <MetricCard label="Open Rate"      value={String(metrics?.rates.open_rate ?? 0)} unit="%" />
          </>
        )}
      </div>

      {/* Chart + Provider health */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-lg border border-border bg-card px-4 pt-4 pb-2">
          <p className="text-xs font-medium text-muted-foreground mb-4">Volume — 7 days</p>
          {chartData.length > 0
            ? <VolumeChart data={chartData} />
            : <p className="py-8 text-center text-sm text-muted-foreground">No data yet</p>
          }
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground mb-4">Provider health</p>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between animate-pulse">
                  <div className="flex items-center gap-2.5">
                    <div className="h-2 w-2 rounded-full bg-muted" />
                    <div className="h-3 w-24 rounded bg-muted" />
                  </div>
                  <div className="h-3 w-12 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : metrics?.providers.length === 0 ? (
            <p className="text-xs text-muted-foreground">No providers configured.</p>
          ) : (
            <div className="space-y-4">
              {metrics?.providers.map((p) => (
                <div key={p.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <DotIndicator status={p.status} />
                    <span className="text-sm">{p.display_name ?? p.provider}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono">{p.success_rate != null ? `${p.success_rate}%` : "—"}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">{p.avg_latency_ms != null ? `${p.avg_latency_ms}ms` : "—"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent messages */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border bg-muted/20">
          <p className="text-xs font-medium">Recent messages</p>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Time</th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Recipient</th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">Subject</th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-muted-foreground animate-pulse">
                  Loading…
                </td>
              </tr>
            ) : emails.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No messages yet.
                </td>
              </tr>
            ) : (
              emails.map((email, i) => (
                <tr
                  key={email.id}
                  className={cn(
                    "hover:bg-muted/20 transition-colors",
                    i < emails.length - 1 && "border-b border-border/50",
                  )}
                >
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(email.created_at).toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs max-w-[180px] truncate">
                    {email.to_email}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[200px] truncate hidden md:table-cell">
                    {email.subject}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={cn("text-xs font-medium capitalize", STATUS_COLOR[email.status] ?? "text-muted-foreground")}>
                      {email.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
