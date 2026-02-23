import { Plus, ArrowRight, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DotIndicator } from "@/components/ui/dot-indicator"
import { cn } from "@/lib/utils"
import { PROVIDER_PERFORMANCE, ROUTING_RULES, FAILOVER_LOG } from "@/lib/mock-data"

export default function RoutingPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-base font-semibold tracking-tight">Routing & Failover</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Provider priority, routing rules, and failover history
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Provider priority */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center justify-between">
            <p className="text-xs font-medium">Provider priority</p>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] text-muted-foreground">
              Reorder
            </Button>
          </div>
          <div className="divide-y divide-border/50">
            {PROVIDER_PERFORMANCE.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xs font-mono text-muted-foreground/60 w-4 text-center">
                  {p.priority}
                </span>
                <DotIndicator status={p.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-[10px] font-mono text-muted-foreground">
                    {p.sent_today.toLocaleString()} sent today · {p.latency_ms}ms avg
                  </p>
                </div>
                <span className={cn(
                  "text-xs font-mono font-medium",
                  p.rate >= 99 ? "text-success" : p.rate >= 97 ? "text-warning" : "text-destructive",
                )}>
                  {p.rate}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Routing rules */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center justify-between">
            <p className="text-xs font-medium">Routing rules</p>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] text-muted-foreground gap-1">
              <Plus className="h-3 w-3" />
              Add rule
            </Button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Name</th>
                <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Condition</th>
                <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Target</th>
                <th className="px-4 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Priority</th>
              </tr>
            </thead>
            <tbody>
              {ROUTING_RULES.map((r, i) => (
                <tr
                  key={r.id}
                  className={cn(
                    "hover:bg-muted/20 transition-colors",
                    i < ROUTING_RULES.length - 1 && "border-b border-border/50",
                  )}
                >
                  <td className="px-4 py-2.5 text-sm font-medium">{r.name}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{r.condition}</td>
                  <td className="px-4 py-2.5 text-xs">{r.provider}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground">
                    {r.priority === 99 ? "default" : `#${r.priority}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Failover history */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border bg-muted/20">
          <p className="text-xs font-medium">Failover history</p>
        </div>
        {FAILOVER_LOG.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            No failover events recorded.
          </p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Timestamp</th>
                <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Event</th>
                <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Reason</th>
                <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">Recovered</th>
                <th className="px-4 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Duration</th>
              </tr>
            </thead>
            <tbody>
              {FAILOVER_LOG.map((f, i) => (
                <tr
                  key={f.id}
                  className={cn(
                    "hover:bg-muted/20 transition-colors",
                    i < FAILOVER_LOG.length - 1 && "border-b border-border/50",
                  )}
                >
                  <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                    {f.ts}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5 text-xs">
                      <AlertTriangle className="h-3 w-3 text-warning flex-shrink-0" />
                      <span className="font-medium">{f.from}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span>{f.to}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{f.reason}</td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground hidden md:table-cell">
                    {f.recovered_at}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground">
                    {f.duration_min}m
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
