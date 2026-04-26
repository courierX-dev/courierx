"use client"

import { RefreshCw } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ProviderConnection } from "@/services/providers.service"
import { ProviderIcon } from "@/components/ui/provider-icon"
import { WebhookSetupSection } from "./webhook-setup-section"

const PROVIDER_LABELS: Record<string, string> = {
  sendgrid: "SendGrid",
  mailgun: "Mailgun",
  ses: "Amazon SES",
  aws_ses: "Amazon SES",
  smtp: "SMTP",
  postmark: "Postmark",
  resend: "Resend",
}

interface Props {
  conn: ProviderConnection | null
  onOpenChange: (open: boolean) => void
  onVerify: () => void
  isVerifying: boolean
}

function row(label: string, value: React.ReactNode) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-mono text-right">{value}</span>
    </div>
  )
}

export function ProviderDetailDialog({ conn, onOpenChange, onVerify, isVerifying }: Props) {
  if (!conn) return null

  const provider = PROVIDER_LABELS[conn.provider] ?? conn.provider
  const lastCheck = conn.last_health_check_at
    ? new Date(conn.last_health_check_at).toLocaleString()
    : "Never"
  const successPct = conn.success_rate != null ? `${(conn.success_rate * 100).toFixed(1)}%` : "—"
  const latency = conn.avg_latency_ms != null ? `${conn.avg_latency_ms} ms` : "—"

  return (
    <Dialog open={!!conn} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <ProviderIcon
              provider={conn.provider}
              size={20}
              chip
              status={conn.status === "active" ? "active" : conn.status === "degraded" ? "inactive" : "error"}
            />
            <div>
              <DialogTitle>{conn.display_name ?? provider}</DialogTitle>
              <DialogDescription>{provider} · {conn.mode.toUpperCase()}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="rounded-md border border-border bg-muted/10 px-3 py-2">
          {row("Status", (
            <span className={cn(
              conn.status === "active" ? "text-success"
                : conn.status === "degraded" ? "text-warning"
                : "text-destructive",
            )}>{conn.status}</span>
          ))}
          {row("Priority", conn.priority)}
          {row("Weight", conn.weight)}
          {row("Success rate", successPct)}
          {row("Avg latency", latency)}
          {row("Consecutive failures", conn.consecutive_failures)}
          {row("Last health check", lastCheck)}
          {conn.region && row("Region", conn.region)}
          {conn.smtp_host && row("SMTP host", `${conn.smtp_host}${conn.smtp_port ? `:${conn.smtp_port}` : ""}`)}
          {row("Connected on", new Date(conn.created_at).toLocaleDateString())}
        </div>

        <p className="text-[11px] text-muted-foreground">
          Credentials are encrypted at rest with AES-256. They are never returned to the dashboard
          after creation — to rotate, disconnect and reconnect with new keys.
        </p>

        {conn.webhook?.supports_auto && (
          <div className="rounded-md border border-border/60 bg-muted/10 p-3">
            <WebhookSetupSection conn={conn} />
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onVerify}
            disabled={isVerifying}
            className="gap-1.5"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isVerifying && "animate-spin")} />
            Re-verify
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
