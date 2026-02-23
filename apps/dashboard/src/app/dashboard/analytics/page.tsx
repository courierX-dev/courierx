"use client"

import { useState } from "react"
import { VolumeChart } from "@/components/dashboard/volume-chart"
import { DotIndicator } from "@/components/ui/dot-indicator"
import { cn } from "@/lib/utils"
import { CHART_DATA, METRICS, PROVIDER_PERFORMANCE } from "@/lib/mock-data"

const RANGES = ["7d", "30d", "90d"] as const
type Range = (typeof RANGES)[number]

const STAT_CARDS = [
  { label: "Total Sent",    value: "14,832",  delta: "+12.4%", positive: true  },
  { label: "Delivered",     value: "14,695",  delta: "+11.9%", positive: true  },
  { label: "Bounced",       value: "91",       delta: "-2.1%",  positive: true  },
  { label: "Open Rate",     value: "32.4%",   delta: "+1.3%",  positive: true  },
  { label: "Click Rate",    value: "8.7%",    delta: "+0.4%",  positive: true  },
]

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>("7d")

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Analytics</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Delivery performance metrics</p>
        </div>
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
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {STAT_CARDS.map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</p>
            <p className="mt-1 text-xl font-bold font-mono tabular-nums">{s.value}</p>
            <p className={cn("mt-0.5 text-xs font-mono", s.positive ? "text-success" : "text-destructive")}>
              {s.delta}
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
        <VolumeChart data={CHART_DATA} />
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
              <th className="px-4 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Sent today</th>
              <th className="px-4 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Rate</th>
              <th className="px-4 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Avg latency</th>
              <th className="px-4 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Priority</th>
            </tr>
          </thead>
          <tbody>
            {PROVIDER_PERFORMANCE.map((p, i) => (
              <tr
                key={p.id}
                className={cn("hover:bg-muted/20 transition-colors", i < PROVIDER_PERFORMANCE.length - 1 && "border-b border-border/50")}
              >
                <td className="px-4 py-2.5 text-sm font-medium">{p.name}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <DotIndicator status={p.status} />
                    <span className="text-xs text-muted-foreground capitalize">{p.status}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-sm">{p.sent_today.toLocaleString()}</td>
                <td className={cn(
                  "px-4 py-2.5 text-right font-mono text-sm",
                  p.rate >= 99 ? "text-success" : p.rate >= 97 ? "text-warning" : "text-destructive",
                )}>
                  {p.rate}%
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-sm text-muted-foreground">{p.latency_ms}ms</td>
                <td className="px-4 py-2.5 text-right font-mono text-sm text-muted-foreground">#{p.priority}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delivery rate over time (simple bar representation) */}
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground mb-4">Daily delivery rate</p>
        <div className="flex items-end gap-1.5 h-16">
          {CHART_DATA.map((d) => {
            const rate = ((d.delivered / d.sent) * 100)
            const height = Math.max(10, ((rate - 97) / 3) * 100)
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-sm bg-success/70 transition-all"
                  style={{ height: `${height}%` }}
                />
                <span className="text-[9px] font-mono text-muted-foreground rotate-0 whitespace-nowrap">
                  {d.date.slice(4)}
                </span>
              </div>
            )
          })}
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
          <span>97.0%</span>
          <span>{METRICS.delivery_rate}% avg</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  )
}
