"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

type ChartPoint = {
  date: string
  sent: number
  delivered: number
  bounced: number
}

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
    <div className="rounded border bg-popover px-3 py-2 text-xs shadow-sm">
      <p className="font-medium mb-1.5">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-muted-foreground capitalize">{entry.name}</span>
          <span className="ml-auto font-mono font-medium">{entry.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

export function VolumeChart({ data }: { data: ChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="gSent" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="var(--color-chart-1)" stopOpacity={0.18} />
            <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gDelivered" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="var(--color-chart-2)" stopOpacity={0.18} />
            <stop offset="95%" stopColor="var(--color-chart-2)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gBounced" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="var(--color-chart-4)" stopOpacity={0.18} />
            <stop offset="95%" stopColor="var(--color-chart-4)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--color-border)" }} />
        <Area type="monotone" dataKey="sent"      stroke="var(--color-chart-1)" strokeWidth={1.5} fill="url(#gSent)"      dot={false} />
        <Area type="monotone" dataKey="delivered" stroke="var(--color-chart-2)" strokeWidth={1.5} fill="url(#gDelivered)" dot={false} />
        <Area type="monotone" dataKey="bounced"   stroke="var(--color-chart-4)" strokeWidth={1.5} fill="url(#gBounced)"   dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
