"use client"

import { useState } from "react"
import { Plus, Trash2, Server } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DotIndicator } from "@/components/ui/dot-indicator"
import { PageShell } from "@/components/dashboard/page-shell"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionError } from "@/components/dashboard/inline-error"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useProviderConnections, useDeleteProviderConnection } from "@/hooks/use-providers"
import type { ProviderConnection } from "@/services/providers.service"
import { ConnectProviderDialog } from "./connect-provider-dialog"

const PROVIDER_LABELS: Record<string, string> = {
  sendgrid: "SendGrid",
  mailgun: "Mailgun",
  ses: "Amazon SES",
  aws_ses: "Amazon SES",
  smtp: "SMTP",
  postmark: "Postmark",
  resend: "Resend",
}

function providerLabel(provider: string) {
  return PROVIDER_LABELS[provider] ?? provider
}

export default function ProvidersPage() {
  const { data: connections, isLoading, isError, refetch } = useProviderConnections()
  const deleteMutation = useDeleteProviderConnection()
  const [connectOpen, setConnectOpen] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  async function handleDelete(conn: ProviderConnection) {
    try {
      await deleteMutation.mutateAsync(conn.id)
      toast.success("Provider disconnected", { description: providerLabel(conn.provider) })
    } catch {
      toast.error("Failed to disconnect provider")
    } finally {
      setConfirmDeleteId(null)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <PageShell>
        <PageHeader title="Providers" subtitle="Connect your email provider accounts" />
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </PageShell>
    )
  }

  // Error state
  if (isError) {
    return (
      <PageShell>
        <PageHeader title="Providers" subtitle="Connect your email provider accounts" />
        <SectionError message="Failed to load providers" onRetry={refetch} />
      </PageShell>
    )
  }

  const providers = connections ?? []

  return (
    <PageShell>
      <PageHeader title="Providers" subtitle="Connect your email provider accounts">
        <Button size="sm" className="h-8 gap-1.5" onClick={() => setConnectOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Connect provider
        </Button>
      </PageHeader>

      {/* Empty state */}
      {providers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Server className="mb-4 h-10 w-10 text-muted-foreground" />
          <h3 className="text-sm font-medium">No providers connected</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-xs">
            Connect a provider to start sending emails. Bring your own API keys for SendGrid, Mailgun, SES, and more.
          </p>
          <Button className="mt-4" size="sm" onClick={() => setConnectOpen(true)}>
            Connect provider
          </Button>
        </div>
      ) : (
        /* Provider cards */
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Provider</th>
                <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">Priority</th>
                <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Success Rate</th>
                <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Avg Latency</th>
                <th className="px-4 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((conn, i) => (
                <tr
                  key={conn.id}
                  className={cn(
                    "hover:bg-muted/20 transition-colors",
                    i < providers.length - 1 && "border-b border-border/50",
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{conn.display_name ?? providerLabel(conn.provider)}</span>
                      <span className="text-[11px] text-muted-foreground">{providerLabel(conn.provider)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <DotIndicator status={conn.status === "active" ? "active" : "inactive"} />
                      <span className="text-xs capitalize">{conn.status}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden md:table-cell">
                    {conn.priority}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden lg:table-cell">
                    {conn.success_rate != null ? `${conn.success_rate.toFixed(1)}%` : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden lg:table-cell">
                    {conn.avg_latency_ms != null ? `${conn.avg_latency_ms}ms` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {confirmDeleteId === conn.id ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-xs text-muted-foreground">Disconnect?</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => setConfirmDeleteId(null)}
                          disabled={deleteMutation.isPending}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => handleDelete(conn)}
                          disabled={deleteMutation.isPending}
                        >
                          {deleteMutation.isPending ? "Removing…" : "Remove"}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        aria-label="Disconnect provider"
                        onClick={() => setConfirmDeleteId(conn.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Info callout */}
      {providers.length > 0 && (
        <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Bring Your Own Keys</p>
          <p>
            Provider credentials are encrypted at rest. CourierX never stores or logs your raw API keys.
            Configure routing rules to control failover priority across providers.
          </p>
        </div>
      )}

      {/* Connect dialog */}
      <ConnectProviderDialog open={connectOpen} onOpenChange={setConnectOpen} />
    </PageShell>
  )
}
