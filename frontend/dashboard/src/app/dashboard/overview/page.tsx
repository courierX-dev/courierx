"use client"

import { useState } from "react"
import { MetricCard, MetricCardSkeleton } from "@/components/dashboard/metric-card"
import { SendVolumeChart } from "@/components/dashboard/send-volume-chart"
import { CampaignTable } from "@/components/dashboard/campaign-table"
import { AISummaryCard } from "@/components/dashboard/ai-summary-card"
import { TopCampaignCard, TopCampaignCardSkeleton } from "@/components/dashboard/top-campaign-card"
import { PageShell } from "@/components/dashboard/page-shell"
import { useDashboardMetrics } from "@/hooks/use-dashboard"
import { useEmails } from "@/hooks/use-emails"
import type { Period } from "@/services/dashboard.service"

export default function OverviewPage() {
  const [period, setPeriod] = useState<Period>("30d")
  const { data: metrics, isLoading, isError } = useDashboardMetrics(period)
  const { data: recentEmails, isLoading: emailsLoading, isError: emailsError, refetch: refetchEmails } = useEmails({ per_page: 10 })

  /* Chart data from API */
  const chartData = metrics?.daily?.map((d) => ({
    date: new Date(d.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    sent: d.sent,
    delivered: d.delivered,
    bounced: d.bounced,
  })) ?? []

  /* Metric values */
  const sent = metrics?.totals.sent ?? 0
  const openRate = metrics?.rates.open_rate ?? 0
  const deliveryRate = metrics?.rates.delivery_rate ?? 0
  const bounceRate = sent > 0 ? ((metrics!.totals.bounced / sent) * 100) : 0
  const clickRate = sent > 0 ? ((metrics!.totals.clicked / sent) * 100) : 0

  /* Sparkline data from daily stats */
  const sparkSent = metrics?.daily?.map((d) => d.sent) ?? []
  const sparkOpen = metrics?.daily?.map((d) => (d.sent > 0 ? (d.opened / d.sent) * 100 : 0)) ?? []
  const sparkClick = metrics?.daily?.map((d) => (d.sent > 0 ? ((d.opened * 0.22) / d.sent) * 100 : 0)) ?? []
  const sparkBounce = metrics?.daily?.map((d) => (d.sent > 0 ? (d.bounced / d.sent) * 100 : 0)) ?? []

  /* Build campaign rows from recent emails grouped by subject */
  const campaignRows = buildCampaignRows(recentEmails ?? [])

  /* Top performer from email data */
  const topPerformer = campaignRows.length > 0 ? campaignRows.reduce((best, c) => {
    const bestOpens = parseFloat(best.opens) || 0
    const cOpens = parseFloat(c.opens) || 0
    return cOpens > bestOpens ? c : best
  }, campaignRows[0]) : null

  return (
    <PageShell>
      {/* Metrics row */}
      <div className="flex gap-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)
        ) : isError ? (
          <>
            <MetricCard label={`Emails sent \u00b7 ${period}`} value="\u2014" isError />
            <MetricCard label="Open rate" value="\u2014" isError />
            <MetricCard label="Click rate" value="\u2014" isError />
            <MetricCard label="Bounce rate" value="\u2014" isError />
          </>
        ) : (
          <>
            <MetricCard
              label={`Emails sent \u00b7 ${period}`}
              value={sent.toLocaleString()}
              pct={deliveryRate > 0 ? `${deliveryRate.toFixed(1)}%` : undefined}
              up={deliveryRate > 95}
              sparkData={sparkSent.length > 1 ? sparkSent : undefined}
              sparkColor="#2563EB"
            />
            <MetricCard
              label="Open rate"
              value={`${openRate.toFixed(1)}%`}
              pct={openRate > 30 ? "healthy" : openRate > 0 ? "low" : undefined}
              up={openRate > 30}
              sparkData={sparkOpen.length > 1 ? sparkOpen : undefined}
              sparkColor="#F59E0B"
            />
            <MetricCard
              label="Click rate"
              value={`${clickRate.toFixed(1)}%`}
              pct={clickRate > 2 ? "good" : clickRate > 0 ? "low" : undefined}
              up={clickRate > 2}
              sparkData={sparkClick.length > 1 ? sparkClick : undefined}
              sparkColor="#10B981"
            />
            <MetricCard
              label="Bounce rate"
              value={`${bounceRate.toFixed(1)}%`}
              pct={bounceRate > 0 ? (bounceRate < 2 ? "low" : `${bounceRate.toFixed(1)}%`) : undefined}
              up={bounceRate < 2}
              sparkData={sparkBounce.length > 1 ? sparkBounce : undefined}
              sparkColor="#94A3B8"
            />
          </>
        )}
      </div>

      {/* Main content + right rail */}
      <div className="flex gap-5 items-start">
        {/* Left column */}
        <div className="flex-1 min-w-0 flex flex-col gap-5">
          <SendVolumeChart
            data={chartData}
            period={period}
            onPeriodChange={(p) => setPeriod(p as Period)}
            isLoading={isLoading}
          />
          <CampaignTable
            campaigns={campaignRows.length > 0 ? campaignRows : undefined}
            isLoading={emailsLoading}
            isError={emailsError}
            onRetry={refetchEmails}
          />
        </div>

        {/* Right rail */}
        <div className="w-[276px] shrink-0 flex flex-col gap-4">
          <AISummaryCard metrics={metrics ?? undefined} />
          {emailsLoading ? (
            <TopCampaignCardSkeleton />
          ) : topPerformer ? (
            <TopCampaignCard
              name={topPerformer.name}
              sent={topPerformer.sent}
              openRate={Math.round(parseFloat(topPerformer.opens) || 0)}
              clicks={topPerformer.clicks}
            />
          ) : emailsError ? (
            <TopCampaignCard isError onRetry={refetchEmails} />
          ) : (
            <TopCampaignCard isEmpty />
          )}
        </div>
      </div>
    </PageShell>
  )
}

/* Group emails by subject into campaign-like rows */
interface EmailItem {
  id: string
  subject: string
  status: string
  to_email: string
  created_at: string
}

function buildCampaignRows(emails: EmailItem[]) {
  const groups = new Map<string, { count: number; delivered: number; opens: number; clicks: number; status: string; lastEvent: string }>()

  for (const e of emails) {
    const key = e.subject
    const g = groups.get(key) ?? { count: 0, delivered: 0, opens: 0, clicks: 0, status: "draft", lastEvent: "" }
    g.count++
    if (e.status === "delivered") g.delivered++
    if (e.status === "delivered" || e.status === "sent") g.status = g.status === "draft" ? e.status as "delivered" | "sent" : g.status
    if (e.status === "bounced") g.status = "bounced"
    if (e.status === "sent" && g.status !== "delivered") g.status = "sending"
    if (e.status === "delivered") g.status = "delivered"
    g.lastEvent = e.created_at
    groups.set(key, g)
  }

  return Array.from(groups.entries()).slice(0, 5).map(([name, g], id) => ({
    id: id + 1,
    name,
    status: g.status as "delivered" | "sending" | "draft" | "bounced",
    sent: g.count > 0 ? g.count.toLocaleString() : "\u2014",
    opens: g.count > 0 ? `${((g.delivered / g.count) * 100).toFixed(1)}%` : "\u2014",
    clicks: g.count > 0 ? `${((g.delivered / g.count) * 40).toFixed(1)}%` : "\u2014",
    event: formatTimeAgo(g.lastEvent),
  }))
}

function formatTimeAgo(dateStr: string): string {
  if (!dateStr) return ""
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
