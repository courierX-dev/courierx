"use client"

import { Star, SendHorizonal } from "lucide-react"
import { useState, useMemo } from "react"
import type { DashboardMetrics } from "@/services/dashboard.service"

interface AISummaryCardProps {
  metrics?: DashboardMetrics
}

function buildSummary(m: DashboardMetrics): React.ReactNode {
  const { totals, rates, daily } = m
  const sent = totals.sent
  const deliveryRate = rates.delivery_rate
  const openRate = rates.open_rate
  const bounceRate = sent > 0 ? (totals.bounced / sent) * 100 : 0
  const clickRate = sent > 0 ? (totals.clicked / sent) * 100 : 0

  // Trend: compare last 7 days vs prior 7 days of daily data
  const days = daily ?? []
  const recent7 = days.slice(-7)
  const prior7 = days.slice(-14, -7)

  let trendNote = ""
  if (recent7.length >= 7 && prior7.length >= 7) {
    const recentAvg = recent7.reduce((s, d) => s + d.sent, 0) / recent7.length
    const priorAvg = prior7.reduce((s, d) => s + d.sent, 0) / prior7.length
    if (priorAvg > 0) {
      const change = ((recentAvg - priorAvg) / priorAvg) * 100
      if (Math.abs(change) >= 1) {
        trendNote = change > 0
          ? ` Send volume is trending up ${change.toFixed(0)}% week-over-week.`
          : ` Send volume is down ${Math.abs(change).toFixed(0)}% week-over-week.`
      }
    }
  }

  const deliveryNote = deliveryRate >= 99
    ? "Delivery rate is excellent"
    : deliveryRate >= 95
      ? "Delivery rate is healthy"
      : "Delivery rate needs attention"

  return (
    <>
      {deliveryNote} at{" "}
      <strong className="text-foreground font-semibold">{deliveryRate.toFixed(1)}%</strong>
      {" "}with an open rate of{" "}
      <strong className="text-foreground font-semibold">{openRate.toFixed(1)}%</strong>
      {" "}and{" "}
      <strong className="text-foreground font-semibold">{clickRate.toFixed(1)}%</strong>
      {" "}click-through across{" "}
      <strong className="text-foreground font-semibold">{sent.toLocaleString()}</strong>
      {" "}emails sent.
      {bounceRate > 2 && (
        <> Bounce rate is elevated at <strong className="text-foreground font-semibold">{bounceRate.toFixed(1)}%</strong> — consider reviewing your suppression list.</>
      )}
      {bounceRate <= 2 && bounceRate > 0 && (
        <> Bounce rate is low at <strong className="text-foreground font-semibold">{bounceRate.toFixed(1)}%</strong>.</>
      )}
      {trendNote}
    </>
  )
}

export function AISummaryCard({ metrics }: AISummaryCardProps) {
  const [query, setQuery] = useState("")

  const summary = useMemo(() => {
    if (!metrics) return null
    return buildSummary(metrics)
  }, [metrics])

  return (
    <div className="bg-card border border-ai-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-ai px-4 py-3 flex items-center gap-2">
        <div className="w-[22px] h-[22px] rounded-md bg-white/15 flex items-center justify-center">
          <Star className="h-3 w-3 text-white" />
        </div>
        <span className="text-[13px] font-semibold text-white flex-1">AI summary</span>
        <span className="text-[10px] text-white/60">Powered by Claude</span>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-3">
        {summary ? (
          <p className="text-[13px] text-foreground/80 leading-[1.7]">{summary}</p>
        ) : (
          <div className="space-y-2">
            <div className="h-3 rounded bg-muted animate-pulse w-full" />
            <div className="h-3 rounded bg-muted animate-pulse w-4/5" />
            <div className="h-3 rounded bg-muted animate-pulse w-3/5" />
          </div>
        )}

        {/* Input */}
        <div className="flex gap-2 bg-ai-subtle border border-ai-border rounded-full py-[6px] px-[6px] pl-[14px] items-center">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Why did bounce rate spike?"
            className="flex-1 text-[13px] text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground"
          />
          <button
            disabled={!query.trim()}
            className="w-8 h-8 rounded-full border-none flex items-center justify-center shrink-0 transition-colors disabled:bg-ai/40 bg-ai text-white disabled:cursor-default cursor-pointer"
          >
            <SendHorizonal className="h-[14px] w-[14px]" />
          </button>
        </div>
      </div>
    </div>
  )
}
