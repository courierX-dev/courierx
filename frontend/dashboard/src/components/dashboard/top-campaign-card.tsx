"use client"

import { AlertCircle, Trophy } from "lucide-react"

interface TopCampaignCardProps {
  name?: string
  sent?: string
  date?: string
  openRate?: number
  clicks?: string
  bounces?: string
  unsubs?: string
  topLinks?: { label: string; pct: number }[]
  isLoading?: boolean
  isError?: boolean
  isEmpty?: boolean
  onRetry?: () => void
}

function Ring({ pct, color = "#2563EB", size = 72, sw = 8 }: { pct: number; color?: string; size?: number; sw?: number }) {
  const r = (size - sw) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-border)" strokeWidth={sw} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeDasharray={`${(pct / 100) * c} ${c}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[13px] font-semibold text-foreground leading-none">{pct}%</span>
      </div>
    </div>
  )
}

export function TopCampaignCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-4 animate-pulse">
      <div className="h-3 w-24 rounded bg-muted mb-4" />
      <div className="flex gap-3.5 items-center mb-4">
        <div className="w-[72px] h-[72px] rounded-full bg-muted shrink-0" />
        <div className="flex-1">
          <div className="h-3 w-28 rounded bg-muted mb-2" />
          <div className="h-2.5 w-20 rounded bg-muted mb-3" />
          <div className="flex gap-3.5">
            {[0, 1, 2].map((i) => (
              <div key={i}>
                <div className="h-2 w-10 rounded bg-muted mb-1" />
                <div className="h-3 w-8 rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-muted pt-3 space-y-2">
        {[0, 1, 2].map((i) => <div key={i} className="h-3 w-full rounded bg-muted" />)}
      </div>
    </div>
  )
}

export function TopCampaignCard({
  name,
  sent,
  date,
  openRate = 0,
  clicks,
  bounces,
  unsubs,
  topLinks,
  isLoading,
  isError,
  isEmpty,
  onRetry,
}: TopCampaignCardProps) {
  if (isLoading) return <TopCampaignCardSkeleton />

  const header = (
    <div className="text-[11px] font-medium text-muted-foreground tracking-[0.06em] uppercase">
      Top performer &middot; 7d
    </div>
  )

  if (isError) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3.5">
        <div className="flex justify-between items-center">
          {header}
          <AlertCircle className="h-3.5 w-3.5 text-muted-foreground/50" aria-label="Data unavailable" />
        </div>
        <div className="flex gap-3.5 items-center opacity-30 pointer-events-none select-none">
          <div className="w-[72px] h-[72px] rounded-full border-[8px] border-border shrink-0 flex items-center justify-center">
            <span className="text-[13px] font-semibold text-muted-foreground">&mdash;</span>
          </div>
          <div className="flex-1">
            <div className="text-[13px] font-semibold text-muted-foreground mb-0.75">&mdash;</div>
            <div className="text-xs text-muted-foreground mb-2.5">&mdash;</div>
            <div className="flex gap-3.5">
              {["Clicks", "Bounces", "Unsubs"].map((l) => (
                <div key={l}>
                  <div className="text-[10px] text-muted-foreground mb-px">{l}</div>
                  <div className="text-[13px] font-semibold text-muted-foreground">&mdash;</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-[11px] text-muted-foreground hover:text-foreground text-left underline-offset-2 hover:underline"
          >
            Retry
          </button>
        )}
      </div>
    )
  }

  if (isEmpty || !name) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3.5">
        {header}
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <Trophy className="h-8 w-8 text-muted-foreground/25 mb-3" />
          <p className="text-[13px] font-medium text-muted-foreground">No top performer yet</p>
          <p className="mt-1 text-[11px] text-muted-foreground/60 max-w-[180px]">
            Your best-performing campaign will appear here once you start sending
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-[14px]">
      {header}

      <div className="flex gap-[14px] items-center">
        <Ring pct={openRate} />
        <div className="flex-1">
          <div className="text-[13px] font-semibold text-foreground mb-[3px]">{name}</div>
          <div className="text-xs text-muted-foreground mb-[10px]">
            {sent} sent &middot; {date}
          </div>
          <div className="flex gap-[14px]">
            {[
              { l: "Clicks", v: clicks },
              { l: "Bounces", v: bounces },
              { l: "Unsubs", v: unsubs },
            ].map((x) => (
              <div key={x.l}>
                <div className="text-[10px] text-muted-foreground mb-[1px]">{x.l}</div>
                <div className="text-[13px] font-semibold text-foreground tabular-nums">{x.v ?? "\u2014"}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {topLinks && topLinks.length > 0 && (
        <div className="border-t border-muted pt-3 flex flex-col gap-[6px]">
          {topLinks.map((x) => (
            <div key={x.label} className="flex items-center gap-2">
              <div className="text-xs text-muted-foreground w-[100px] shrink-0 truncate">{x.label}</div>
              <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${x.pct}%` }} />
              </div>
              <div className="text-[11px] text-muted-foreground w-7 text-right tabular-nums font-mono">{x.pct}%</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
