"use client"

import { useState } from "react"
import { Send, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useWebhookDeliveries, useTestWebhook } from "@/hooks/use-webhooks"
import type { WebhookEndpoint, WebhookDelivery } from "@/services/webhooks.service"

interface Props {
  endpoint: WebhookEndpoint | null
  onOpenChange: (open: boolean) => void
}

export function WebhookDeliveriesDialog({ endpoint, onOpenChange }: Props) {
  const [selected, setSelected] = useState<WebhookDelivery | null>(null)
  const { data: deliveries, isLoading, isError } = useWebhookDeliveries(endpoint?.id ?? null)
  const testMutation = useTestWebhook()

  async function handleTest() {
    if (!endpoint) return
    try {
      await testMutation.mutateAsync(endpoint.id)
      toast.success("Test event sent", { description: "Refreshing delivery log…" })
    } catch {
      toast.error("Failed to send test event")
    }
  }

  return (
    <Dialog open={!!endpoint} onOpenChange={(o) => { if (!o) { setSelected(null); onOpenChange(false) } }}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm truncate">{endpoint?.url}</DialogTitle>
          <DialogDescription>Recent delivery attempts (last 50)</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleTest}
            disabled={testMutation.isPending}
            className="gap-1.5"
          >
            {testMutation.isPending
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Send className="h-3.5 w-3.5" />}
            Send test event
          </Button>
          <span className="ml-auto text-[11px] text-muted-foreground font-mono">
            {deliveries?.length ?? 0} attempt{deliveries?.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="flex-1 overflow-auto rounded-md border border-border">
          {isLoading ? (
            <div className="p-4 space-y-2" aria-busy="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-8 rounded bg-muted animate-pulse" />
              ))}
            </div>
          ) : isError ? (
            <p className="p-6 text-sm text-destructive">Could not load deliveries.</p>
          ) : !deliveries || deliveries.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground">No deliveries yet.</p>
              <p className="text-[11px] text-muted-foreground/60 mt-1">
                Send a test event to verify your endpoint is reachable.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {deliveries.map((d) => (
                <li
                  key={d.id}
                  onClick={() => setSelected(d)}
                  className={cn(
                    "px-3 py-2 flex items-center gap-3 text-xs cursor-pointer hover:bg-muted/30",
                    selected?.id === d.id && "bg-muted/40",
                  )}
                >
                  <span className={cn(
                    "h-1.5 w-1.5 rounded-full shrink-0",
                    d.success ? "bg-success" : "bg-destructive",
                  )} />
                  <span className="font-mono text-[11px] text-muted-foreground w-40 shrink-0">
                    {new Date(d.created_at).toLocaleString()}
                  </span>
                  <span className="font-mono w-16 shrink-0">
                    {d.response_status ?? "—"}
                  </span>
                  <span className="text-muted-foreground truncate">
                    {d.event_type ?? "event"}
                    {d.attempt_count > 1 ? ` · attempt ${d.attempt_count}` : ""}
                    {d.next_retry_at && !d.success ? ` · retry ${new Date(d.next_retry_at).toLocaleString()}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {selected && (
          <div className="rounded-md border border-border bg-muted/10 max-h-60 overflow-auto">
            <div className="px-3 py-1.5 border-b border-border flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Response · {selected.response_status ?? "no response"}
              </span>
              <button
                onClick={() => setSelected(null)}
                className="ml-auto text-[11px] text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>
            <pre className="p-3 text-[11px] font-mono whitespace-pre-wrap break-all">
              {selected.response_body || "(empty body)"}
            </pre>
            <div className="px-3 py-1.5 border-t border-border text-[10px] uppercase tracking-wide text-muted-foreground">
              Payload sent
            </div>
            <pre className="p-3 text-[11px] font-mono whitespace-pre-wrap break-all">
              {JSON.stringify(selected.payload, null, 2)}
            </pre>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
