"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { ErrorBanner } from "./inline-error"

type CampaignStatus = "delivered" | "sending" | "draft" | "bounced" | "scheduled"

interface Campaign {
  id: number
  name: string
  status: CampaignStatus
  sent: string
  opens: string
  clicks: string
  event: string
}

const STATUS_CONFIG: Record<
  CampaignStatus,
  { bg: string; color: string; border: string; dot: string; label: string }
> = {
  delivered: { bg: "bg-[#ECFDF5] dark:bg-emerald-950", color: "text-[#059669] dark:text-emerald-400", border: "border-[#A7F3D0] dark:border-emerald-800", dot: "bg-success", label: "Delivered" },
  sending: { bg: "bg-[#EFF6FF] dark:bg-blue-950", color: "text-primary dark:text-blue-400", border: "border-[#BFDBFE] dark:border-blue-800", dot: "bg-primary", label: "Sending" },
  draft: { bg: "bg-muted", color: "text-muted-foreground", border: "border-border", dot: "bg-muted-foreground", label: "Draft" },
  bounced: { bg: "bg-[#FEF2F2] dark:bg-red-950", color: "text-destructive dark:text-red-400", border: "border-[#FECACA] dark:border-red-800", dot: "bg-destructive", label: "Bounced" },
  scheduled: { bg: "bg-[#FFFBEB] dark:bg-amber-950", color: "text-[#B45309] dark:text-amber-400", border: "border-[#FDE68A] dark:border-amber-800", dot: "bg-warning", label: "Scheduled" },
}

function StatusBadge({ status }: { status: CampaignStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[5px] text-[11px] font-medium px-2 py-[2px] rounded-full border whitespace-nowrap",
        cfg.bg,
        cfg.color,
        cfg.border
      )}
    >
      <span className={cn("w-[6px] h-[6px] rounded-full shrink-0", cfg.dot)} />
      {cfg.label}
    </span>
  )
}

interface CampaignTableProps {
  campaigns?: Campaign[]
  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void
}

export function CampaignTable({ campaigns, isLoading, isError, onRetry }: CampaignTableProps) {
  const router = useRouter()
  const thClass =
    "text-[11px] font-medium text-muted-foreground tracking-[0.05em] uppercase py-2 px-[14px] text-left bg-background border-b border-border whitespace-nowrap"

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-[14px] border-b border-border flex justify-between items-center">
        <span className="text-sm font-semibold text-foreground">Recent campaigns</span>
        <Link href="/dashboard/campaigns" className="text-xs text-primary font-medium hover:underline">
          View all &rarr;
        </Link>
      </div>
      {isLoading ? (
        <div className="p-4 space-y-3" aria-busy="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 rounded-md bg-muted animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <ErrorBanner message="Could not load campaigns" onRetry={onRetry} />
      ) : !campaigns || campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm font-medium text-foreground">No campaigns yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Email activity will appear here once you start sending</p>
        </div>
      ) : (
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={thClass}>Campaign</th>
            <th className={cn(thClass, "text-right")}>Sent</th>
            <th className={cn(thClass, "text-right hidden md:table-cell")}>Opens</th>
            <th className={cn(thClass, "text-right hidden md:table-cell")}>Clicks</th>
            <th className={cn(thClass, "hidden lg:table-cell")}>Last event</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((r, i) => (
            <tr
              key={r.id}
              onClick={() => router.push(`/dashboard/campaigns?subject=${encodeURIComponent(r.name)}`)}
              className={cn(
                "cursor-pointer transition-colors hover:bg-muted/50",
                i % 2 === 1 && "bg-background"
              )}
            >
              <td className="px-[14px] h-11 align-middle border-b border-border/50 min-w-[200px]">
                <div className="flex items-center gap-2">
                  <StatusBadge status={r.status} />
                  <span className="text-[13px] font-medium text-foreground">{r.name}</span>
                </div>
              </td>
              <td className="px-[14px] h-11 align-middle border-b border-border/50 text-right">
                <span className={cn("font-mono text-[13px]", r.sent === "\u2014" ? "text-border" : "text-foreground/80")}>
                  {r.sent}
                </span>
              </td>
              <td className="px-[14px] h-11 align-middle border-b border-border/50 text-right hidden md:table-cell">
                <span className={cn("font-mono text-[13px]", r.opens === "\u2014" ? "text-border" : "text-foreground/80 font-medium")}>
                  {r.opens}
                </span>
              </td>
              <td className="px-[14px] h-11 align-middle border-b border-border/50 text-right hidden md:table-cell">
                <span className={cn("font-mono text-[13px]", r.clicks === "\u2014" ? "text-border" : "text-foreground/80")}>
                  {r.clicks}
                </span>
              </td>
              <td className="px-[14px] h-11 align-middle border-b border-border/50 hidden lg:table-cell">
                <span className="text-xs text-muted-foreground">{r.event}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      )}
    </div>
  )
}
