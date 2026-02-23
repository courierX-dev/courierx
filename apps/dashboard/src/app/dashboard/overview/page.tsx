import { ArrowUpRight, ArrowDownRight } from "lucide-react"
import { VolumeChart } from "@/components/dashboard/volume-chart"
import { DotIndicator } from "@/components/ui/dot-indicator"
import { cn } from "@/lib/utils"
import { METRICS, CHART_DATA, LOGS, PROVIDER_PERFORMANCE } from "@/lib/mock-data"

const STATUS_COLOR: Record<string, string> = {
  delivered: "text-success",
  opened:    "text-sky-500 dark:text-sky-400",
  clicked:   "text-violet-500 dark:text-violet-400",
  bounced:   "text-destructive",
  failed:    "text-destructive",
  queued:    "text-muted-foreground",
  sent:      "text-primary",
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

export default function OverviewPage() {
  const bounceRate = ((METRICS.bounced / METRICS.sent_24h) * 100).toFixed(2)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-base font-semibold tracking-tight">Overview</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">Last 24 hours · Production</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Sent (24h)"
          value={METRICS.sent_24h.toLocaleString()}
          change={METRICS.changes.sent}
        />
        <MetricCard
          label="Delivery Rate"
          value={String(METRICS.delivery_rate)}
          unit="%"
          change={METRICS.changes.delivered}
        />
        <MetricCard
          label="Bounce Rate"
          value={bounceRate}
          unit="%"
          change={METRICS.changes.bounced}
        />
        <MetricCard
          label="Open Rate"
          value={String(METRICS.open_rate)}
          unit="%"
          change={METRICS.changes.open_rate}
        />
      </div>

      {/* Chart + Provider health */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-lg border border-border bg-card px-4 pt-4 pb-2">
          <p className="text-xs font-medium text-muted-foreground mb-4">Volume — 7 days</p>
          <VolumeChart data={CHART_DATA} />
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground mb-4">Provider health</p>
          <div className="space-y-4">
            {PROVIDER_PERFORMANCE.map((p) => (
              <div key={p.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <DotIndicator status={p.status} />
                  <span className="text-sm">{p.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-xs font-mono">{p.rate}%</p>
                  <p className="text-[10px] font-mono text-muted-foreground">{p.latency_ms}ms</p>
                </div>
              </div>
            ))}
          </div>
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
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Provider</th>
            </tr>
          </thead>
          <tbody>
            {LOGS.slice(0, 5).map((log, i) => (
              <tr
                key={log.id}
                className={cn(
                  "hover:bg-muted/20 transition-colors",
                  i < 4 && "border-b border-border/50",
                )}
              >
                <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground whitespace-nowrap">
                  {log.ts.slice(11)}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs max-w-[180px] truncate">
                  {log.to}
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[200px] truncate hidden md:table-cell">
                  {log.subject}
                </td>
                <td className="px-4 py-2.5">
                  <span className={cn("text-xs font-medium capitalize", STATUS_COLOR[log.status] ?? "text-muted-foreground")}>
                    {log.status}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground hidden lg:table-cell">
                  {log.provider}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
