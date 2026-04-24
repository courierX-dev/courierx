"use client"

import { useState, useMemo, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Search, Mail } from "lucide-react"
import { Input } from "@/components/ui/input"
import { PageShell } from "@/components/dashboard/page-shell"
import { PageHeader } from "@/components/dashboard/page-header"
import { InlineError } from "@/components/dashboard/inline-error"
import { AnimatedNumber } from "@/components/dashboard/animated-number"
import { cn } from "@/lib/utils"
import { useEmails } from "@/hooks/use-emails"
import { CampaignDetailDialog } from "./campaign-detail-dialog"
import type { CampaignGroup } from "./types"

const STATUS_STYLES: Record<string, { dot: string; text: string }> = {
  delivered: { dot: "bg-success", text: "text-success" },
  sending:   { dot: "bg-primary", text: "text-primary" },
  sent:      { dot: "bg-primary", text: "text-primary" },
  bounced:   { dot: "bg-destructive", text: "text-destructive" },
  failed:    { dot: "bg-destructive", text: "text-destructive" },
  queued:    { dot: "bg-muted-foreground", text: "text-muted-foreground" },
  draft:     { dot: "bg-muted-foreground", text: "text-muted-foreground" },
}


export default function CampaignsPage() {
  const searchParams = useSearchParams()
  const initialSubject = searchParams.get("subject") ?? ""
  const [search, setSearch] = useState("")
  const [openCampaign, setOpenCampaign] = useState<CampaignGroup | null>(null)
  const { data: emails, isLoading, isError, refetch } = useEmails({ per_page: 200 })

  const campaigns = useMemo(() => {
    if (!emails) return []

    const groups = new Map<string, CampaignGroup>()

    for (const email of emails) {
      const key = email.subject
      const existing = groups.get(key) ?? {
        subject: email.subject,
        totalSent: 0,
        delivered: 0,
        bounced: 0,
        failed: 0,
        openRate: 0,
        status: "queued",
        lastActivity: "",
        recipients: [],
        tags: [],
        sampleEmailId: email.id,
        fromEmail: email.from_email,
      }

      if (!existing.lastActivity || email.created_at > existing.lastActivity) {
        existing.sampleEmailId = email.id
      }

      existing.totalSent++
      if (email.status === "delivered") existing.delivered++
      if (email.status === "bounced") existing.bounced++
      if (email.status === "failed") existing.failed++

      // Determine overall status
      if (email.status === "delivered") existing.status = "delivered"
      else if (email.status === "sent" && existing.status !== "delivered") existing.status = "sending"
      else if (email.status === "bounced" && existing.status === "queued") existing.status = "bounced"

      // Track latest activity
      if (!existing.lastActivity || email.created_at > existing.lastActivity) {
        existing.lastActivity = email.created_at
      }

      // Collect unique recipients (cap at 5 for display)
      if (existing.recipients.length < 5 && !existing.recipients.includes(email.to_email)) {
        existing.recipients.push(email.to_email)
      }

      // Collect tags
      for (const tag of email.tags ?? []) {
        if (!existing.tags.includes(tag)) existing.tags.push(tag)
      }

      groups.set(key, existing)
    }

    // Calculate open rate approximation (delivered / sent)
    for (const g of groups.values()) {
      g.openRate = g.totalSent > 0 ? (g.delivered / g.totalSent) * 100 : 0
    }

    return Array.from(groups.values()).sort(
      (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    )
  }, [emails])

  useEffect(() => {
    if (!initialSubject || openCampaign) return
    const match = campaigns.find((c) => c.subject === initialSubject)
    if (match) setOpenCampaign(match)
  }, [initialSubject, campaigns, openCampaign])

  const filtered = useMemo(() => {
    if (!search) return campaigns
    const q = search.toLowerCase()
    return campaigns.filter(
      (c) =>
        c.subject.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q)),
    )
  }, [campaigns, search])

  // Totals for stat cards
  const totalSent = campaigns.reduce((s, c) => s + c.totalSent, 0)
  const totalDelivered = campaigns.reduce((s, c) => s + c.delivered, 0)
  const totalBounced = campaigns.reduce((s, c) => s + c.bounced, 0)
  const avgDeliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0

  return (
    <PageShell>
      <PageHeader title="Campaigns" subtitle="Email activity grouped by subject" />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Campaigns", value: campaigns.length.toLocaleString() },
          { label: "Total sent", value: totalSent.toLocaleString() },
          { label: "Delivered", value: totalDelivered.toLocaleString() },
          { label: "Avg delivery rate", value: `${avgDeliveryRate.toFixed(1)}%` },
        ].map((s) => (
          <div key={s.label} className={cn("rounded-xl border border-border bg-card p-4", isLoading && "animate-pulse")}>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">{s.label}</p>
            <AnimatedNumber
              value={isLoading ? " " : isError ? "—" : s.value}
              className="mt-1.5 text-xl font-bold font-mono tabular-nums block"
            />
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-8 h-8 text-sm w-72"
            placeholder="Search by subject or tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={isError || isLoading}
          />
        </div>
        <span className="ml-auto text-xs text-muted-foreground font-mono">
          {filtered.length} campaign{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Campaign list */}
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="px-4 py-2.5 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Campaign</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">Status</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Sent</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Delivered</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Bounced</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Delivery %</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">Last activity</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-6" aria-busy="true">
                  <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-12 rounded bg-muted animate-pulse" />
                    ))}
                  </div>
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={7}>
                  <InlineError message="Could not load campaigns" onRetry={refetch} />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center">
                  <Mail className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    {search ? "No campaigns match your search" : "No campaigns yet"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground max-w-xs mx-auto">
                    {search
                      ? "Try a different search term."
                      : "Campaigns will appear here once you start sending emails through the API."}
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((c, i) => {
                const style = STATUS_STYLES[c.status] ?? STATUS_STYLES.queued
                const deliveryPct = c.totalSent > 0 ? (c.delivered / c.totalSent) * 100 : 0
                return (
                  <tr
                    key={c.subject}
                    onClick={() => setOpenCampaign(c)}
                    className={cn(
                      "hover:bg-muted/20 transition-colors cursor-pointer",
                      i < filtered.length - 1 && "border-b border-border/50",
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate max-w-[280px]">{c.subject}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {c.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center rounded border border-border px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground"
                              >
                                {tag}
                              </span>
                            ))}
                            <span className="text-[10px] text-muted-foreground">
                              {c.recipients.length > 1
                                ? `${c.recipients[0]} +${c.totalSent - 1}`
                                : c.recipients[0] ?? "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
                        <span className={cn("text-xs font-medium capitalize", style.text)}>
                          {c.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm tabular-nums">
                      {c.totalSent.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm tabular-nums text-muted-foreground hidden lg:table-cell">
                      {c.delivered.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm tabular-nums hidden lg:table-cell">
                      <span className={c.bounced > 0 ? "text-destructive" : "text-muted-foreground"}>
                        {c.bounced.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              deliveryPct >= 95 ? "bg-success" : deliveryPct >= 80 ? "bg-warning" : "bg-destructive",
                            )}
                            style={{ width: `${Math.min(deliveryPct, 100)}%` }}
                          />
                        </div>
                        <span className={cn(
                          "font-mono text-xs font-medium tabular-nums",
                          deliveryPct >= 95 ? "text-success" : deliveryPct >= 80 ? "text-warning" : "text-destructive",
                        )}>
                          {deliveryPct.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[11px] text-muted-foreground whitespace-nowrap hidden md:table-cell">
                      {formatTimeAgo(c.lastActivity)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <CampaignDetailDialog
        campaign={openCampaign}
        onOpenChange={(open) => !open && setOpenCampaign(null)}
      />
    </PageShell>
  )
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
