"use client"

import { AlertCircle } from "lucide-react"
import { Sparkline } from "./sparkline"
import { AnimatedNumber } from "./animated-number"

interface MetricCardProps {
  label: string
  value: string
  pct?: string
  up?: boolean
  sparkData?: number[]
  sparkColor?: string
  isError?: boolean
}

export function MetricCard({ label, value, pct, up, sparkData, sparkColor = "#2563EB", isError }: MetricCardProps) {
  return (
    <div className={`bg-card border border-border rounded-xl p-5 flex-1 min-w-0 flex flex-col gap-3${isError ? " opacity-50" : ""}`}>
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        {isError ? (
          <AlertCircle className="h-3.5 w-3.5 text-muted-foreground/60" aria-label="Data unavailable" />
        ) : pct ? (
          <span
            className={`inline-flex items-center gap-[3px] text-[11px] font-semibold px-[7px] py-[2px] rounded-full border ${
              up
                ? "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0] dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800"
                : "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA] dark:bg-red-950 dark:text-red-400 dark:border-red-800"
            }`}
          >
            {up ? "\u2191" : "\u2193"} {pct}
          </span>
        ) : null}
      </div>
      {isError ? (
        <span className="text-[34px] font-semibold text-muted-foreground/30 tracking-[-0.03em] leading-none tabular-nums select-none">&mdash;</span>
      ) : (
        <AnimatedNumber
          value={value}
          className="text-[34px] font-semibold text-foreground tracking-[-0.03em] leading-none tabular-nums"
        />
      )}
      {!isError && sparkData && sparkData.length > 1 && <Sparkline data={sparkData} color={sparkColor} />}
    </div>
  )
}

export function MetricCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex-1 min-w-0 animate-pulse">
      <div className="h-3 w-20 rounded bg-muted mb-3" />
      <div className="h-8 w-24 rounded bg-muted mb-3" />
      <div className="h-9 w-[120px] rounded bg-muted" />
    </div>
  )
}
