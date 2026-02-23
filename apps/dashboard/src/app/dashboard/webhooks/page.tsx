import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DotIndicator } from "@/components/ui/dot-indicator"
import { cn } from "@/lib/utils"
import { WEBHOOKS } from "@/lib/mock-data"

export default function WebhooksPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Webhooks</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Receive real-time delivery events via HTTP POST
          </p>
        </div>
        <Button size="sm" className="h-8 gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add webhook
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Name</th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">URL</th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">Events</th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Status</th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Last triggered</th>
              <th className="px-4 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Success</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {WEBHOOKS.map((w, i) => (
              <tr
                key={w.id}
                className={cn(
                  "hover:bg-muted/20 transition-colors",
                  i < WEBHOOKS.length - 1 && "border-b border-border/50",
                )}
              >
                <td className="px-4 py-2.5 text-sm font-medium">{w.name}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground max-w-[200px] truncate">
                  {w.url}
                </td>
                <td className="px-4 py-2.5 hidden md:table-cell">
                  <div className="flex gap-1 flex-wrap">
                    {w.events.map((ev) => (
                      <span
                        key={ev}
                        className="inline-flex items-center rounded border border-border px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground"
                      >
                        {ev}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <DotIndicator status={w.status} />
                    <span className="text-xs capitalize">{w.status}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground hidden lg:table-cell">
                  {w.last_triggered}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-xs hidden lg:table-cell">
                  <span className={cn(
                    w.success_rate === 100 ? "text-success" :
                    w.success_rate >= 95 ? "text-warning" : "text-destructive",
                  )}>
                    {w.success_rate}%
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground">
                    Edit
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payload note */}
      <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
        <p className="text-xs font-medium mb-2">Example payload</p>
        <pre className="font-mono text-[11px] text-muted-foreground leading-relaxed overflow-x-auto">
{`{
  "event":      "delivered",
  "message_id": "msg_001",
  "to":         "user@example.com",
  "provider":   "SES",
  "timestamp":  "2025-02-23T14:32:01Z",
  "latency_ms": 142
}`}
        </pre>
      </div>
    </div>
  )
}
