"use client"

import { RefreshCw, ShieldCheck } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

function Metric({ label, value, valueClassName }: { label: string; value: React.ReactNode; valueClassName?: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border/60 bg-card px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">{label}</div>
      <div className={cn("font-mono text-sm mt-0.5 truncate", valueClassName)} title={typeof value === "string" ? value : undefined}>
        {value}
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs font-mono text-right truncate min-w-0">{value}</span>
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

  const statusTone =
    conn.status === "active"
      ? "bg-[#ECFDF5] text-[#10B981] border-[#A7F3D0] dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800"
      : conn.status === "degraded"
        ? "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A] dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800"
        : conn.status === "inactive"
          ? "bg-muted text-muted-foreground border-border"
          : "bg-[#FEF2F2] text-destructive border-[#FECACA] dark:bg-red-950 dark:text-red-400 dark:border-red-800"

  const statusLabel =
    conn.status === "active"
      ? "Connected"
      : conn.status === "degraded"
        ? "Degraded"
        : conn.status === "inactive"
          ? "Excluded"
          : "Error"

  return (
    <Dialog open={!!conn} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden p-0 gap-0">
        {/* Header bar */}
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-border/60">
          <div className="flex items-center gap-3 min-w-0">
            <ProviderIcon
              provider={conn.provider}
              size={24}
              chip
              status={conn.status === "active" ? "active" : conn.status === "degraded" ? "inactive" : "error"}
            />
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base truncate">{conn.display_name ?? provider}</DialogTitle>
              <div className="flex items-center gap-2 mt-0.5 min-w-0">
                <span className="text-xs text-muted-foreground truncate">{provider}</span>
                <span className="text-[10px] text-muted-foreground/60 shrink-0">·</span>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium shrink-0">
                  {conn.mode}
                </span>
              </div>
            </div>
            <span
              className={cn(
                "shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full border",
                statusTone,
              )}
            >
              {statusLabel}
            </span>
          </div>
        </DialogHeader>

        <div className="px-5 py-4 space-y-4">
          {/* Top metrics — what the user looks at first */}
          <div className="grid grid-cols-3 gap-2">
            <Metric
              label="Success"
              value={successPct}
              valueClassName={conn.success_rate != null && conn.success_rate < 0.95 ? "text-warning" : undefined}
            />
            <Metric label="Latency" value={latency} />
            <Metric
              label="Failures"
              value={conn.consecutive_failures}
              valueClassName={conn.consecutive_failures > 0 ? "text-destructive" : undefined}
            />
          </div>

          {/* Configuration / metadata */}
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1.5 px-0.5">
              Configuration
            </div>
            <div className="rounded-lg border border-border bg-muted/10 px-3 py-1">
              <DetailRow label="Priority" value={conn.priority} />
              <DetailRow label="Weight" value={conn.weight} />
              {conn.region && <DetailRow label="Region" value={conn.region} />}
              {conn.smtp_host && (
                <DetailRow
                  label="SMTP host"
                  value={`${conn.smtp_host}${conn.smtp_port ? `:${conn.smtp_port}` : ""}`}
                />
              )}
              <DetailRow label="Last health check" value={lastCheck} />
              <DetailRow label="Connected on" value={new Date(conn.created_at).toLocaleDateString()} />
            </div>
          </div>

          {/* Webhook section */}
          {conn.webhook?.supports_auto && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1.5 px-0.5">
                Event delivery
              </div>
              <div className="rounded-lg border border-border bg-muted/10 p-3">
                <WebhookSetupSection conn={conn} />
              </div>
            </div>
          )}

          {/* Security note */}
          <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/20 p-2.5">
            <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Credentials are encrypted at rest with AES-256 and never returned to the dashboard.
              To rotate, disconnect and reconnect with new keys.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border/60 bg-muted/20">
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
