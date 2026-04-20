"use client"

import { useState } from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { cn } from "@/lib/utils"

type ChartPoint = {
  date: string
  sent: number
  delivered?: number
  bounced?: number
}

const PERIODS = ["7d", "30d", "90d"] as const
type Period = (typeof PERIODS)[number]

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-card">
      <p className="font-medium mb-1.5 text-foreground">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-muted-foreground capitalize">{entry.name}</span>
          <span className="ml-auto font-mono font-medium text-foreground">{entry.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

interface SendVolumeChartProps {
  data: ChartPoint[]
  period?: Period
  onPeriodChange?: (p: Period) => void
  isLoading?: boolean
}

export function SendVolumeChart({ data, period = "30d", onPeriodChange, isLoading }: SendVolumeChartProps) {
  const [selected, setSelected] = useState<Period>(period)

  function handlePeriod(p: Period) {
    setSelected(p)
    onPeriodChange?.(p)
  }

  const periodLabel = selected === "7d" ? "Last 7 days" : selected === "90d" ? "Last 90 days" : "Last 30 days"

  return (
    <div className="bg-card border border-border rounded-xl px-5 pt-[18px] pb-[14px]">
      <div className="flex justify-between items-center mb-4">
        <div>
          {isLoading ? (
            <>
              <div className="h-4 w-24 rounded bg-muted animate-pulse mb-1" />
              <div className="h-3 w-20 rounded bg-muted animate-pulse" />
            </>
          ) : (
            <>
              <div className="text-sm font-semibold text-foreground">Send volume</div>
              <div className="text-xs text-muted-foreground mt-[1px]">{periodLabel}</div>
            </>
          )}
        </div>
        {/* Period switcher with pill indicator */}
        <div className="relative flex bg-muted rounded-lg p-[3px]">
          {/* Sliding pill background */}
          <div
            className="absolute top-[3px] h-[calc(100%-6px)] rounded-md bg-card border border-border shadow-sm transition-all duration-200 ease-out"
            style={{
              width: `calc(${100 / PERIODS.length}% - 2px)`,
              left: `calc(${PERIODS.indexOf(selected) * (100 / PERIODS.length)}% + 1px)`,
            }}
          />
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => handlePeriod(p)}
              disabled={isLoading}
              className={cn(
                "relative z-10 text-[11px] font-medium px-3 py-[3px] rounded-md transition-colors duration-150",
                p === selected
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground/70",
                isLoading && "cursor-default opacity-50"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="transition-opacity duration-200" aria-busy={isLoading}>
        {isLoading ? (
          <div className="h-24 rounded-md bg-muted animate-pulse" />
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
            No send data for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={96}>
            <AreaChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="sendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
                width={40}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--color-border)" }} />
              <Area
                type="monotone"
                dataKey="sent"
                stroke="var(--color-chart-1)"
                strokeWidth={1.75}
                fill="url(#sendGrad)"
                dot={false}
                animationDuration={400}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
