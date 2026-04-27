"use client"

import { RefreshCw, ShieldCheck, Activity, Clock, BarChart3 } from "lucide-react"
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

function MetricTile({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: React.ReactNode
  hint?: string
  tone?: "default" | "warn" | "danger"
}) {
  const valueTone =
    tone === "danger"
      ? "text-destructive"
      : tone === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : "text-foreground"
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 min-w-0">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </div>
      <div className={cn("font-mono text-base mt-1 tabular-nums truncate", valueTone)}>
        {value}
      </div>
      {hint && (
        <div className="text-[10px] text-muted-foreground/80 mt-0.5 truncate">{hint}</div>
      )}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs font-mono text-right truncate min-w-0 max-w-[60%]">{value}</span>
    </div>
  )
}

export function ProviderDetailDialog({ conn, onOpenChange, onVerify, isVerifying }: Props) {
  if (!conn) return null

  const provider = PROVIDER_LABELS[conn.provider] ?? conn.provider
  const lastCheck = conn.last_health_check_at
    ? new Date(conn.last_health_check_at).toLocaleString()
    : null

  const hasSendData = conn.sent_count + conn.failed_count > 0
  const successPct =
    conn.success_rate != null ? `${(conn.success_rate * 100).toFixed(1)}%` : null
  const successTone =
    conn.success_rate != null && conn.success_rate < 0.95
      ? conn.success_rate < 0.8
        ? "danger"
        : "warn"
      : "default"

  const latency = conn.avg_latency_ms != null ? `${conn.avg_latency_ms} ms` : null
  const failureTone =
    conn.consecutive_failures >= 3
      ? "danger"
      : conn.consecutive_failures > 0
        ? "warn"
        : "default"

  const statusTone =
    conn.status === "active"
      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400"
      : conn.status === "degraded"
        ? "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400"
        : conn.status === "inactive"
          ? "bg-muted text-muted-foreground border-border"
          : "bg-destructive/10 text-destructive border-destructive/30"

  const statusLabel =
    conn.status === "active"
      ? "Connected"
      : conn.status === "degraded"
        ? "Degraded"
        : conn.status === "inactive"
          ? "Excluded"
          : "Error"

  const windowLabel = `Last ${conn.stats_window_hours ?? 24}h`

  return (
    <Dialog open={!!conn} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border/60">
          <div className="flex items-center gap-3 min-w-0">
            <ProviderIcon
              provider={conn.provider}
              size={28}
              chip
              status={conn.status === "active" ? "active" : conn.status === "degraded" ? "inactive" : "error"}
            />
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-semibold truncate">
                {conn.display_name ?? provider}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-0.5 min-w-0 text-[11px] text-muted-foreground">
                <span className="truncate">{provider}</span>
                <span className="opacity-50 shrink-0">·</span>
                <span className="uppercase tracking-wide font-medium shrink-0">{conn.mode}</span>
                <span className="opacity-50 shrink-0">·</span>
                <span className="truncate">Priority {conn.priority}</span>
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

        <div className="px-6 py-5 space-y-5">
          {/* Live metrics */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                <h3 className="text-xs font-semibold tracking-wide">Live performance</h3>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {windowLabel}
              </span>
            </div>

            {hasSendData ? (
              <div className="grid grid-cols-3 gap-2">
                <MetricTile
                  label="Success"
                  value={successPct ?? "—"}
                  hint={`${conn.sent_count.toLocaleString()} delivered`}
                  tone={successTone}
                />
                <MetricTile
                  label="Latency"
                  value={latency ?? "—"}
                  hint="queue → sent"
                />
                <MetricTile
                  label="Failures"
                  value={conn.failed_count.toLocaleString()}
                  hint={
                    conn.consecutive_failures > 0
                      ? `${conn.consecutive_failures} in a row`
                      : "none in a row"
                  }
                  tone={failureTone}
                />
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-muted/10 px-4 py-5 text-center">
                <BarChart3 className="h-5 w-5 text-muted-foreground mx-auto mb-1.5" />
                <div className="text-xs font-medium">No sends in the last {conn.stats_window_hours ?? 24}h</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Performance metrics appear once this provider handles email traffic.
                </div>
                {conn.consecutive_failures > 0 && (
                  <div className="text-[11px] text-destructive mt-2">
                    {conn.consecutive_failures} consecutive health-check failure
                    {conn.consecutive_failures === 1 ? "" : "s"}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Configuration */}
          <section>
            <h3 className="text-xs font-semibold tracking-wide mb-2">Configuration</h3>
            <div className="rounded-lg border border-border/60 bg-card px-3.5">
              <DetailRow label="Priority" value={conn.priority} />
              <DetailRow label="Weight" value={conn.weight} />
              {conn.region && <DetailRow label="Region" value={conn.region} />}
              {conn.smtp_host && (
                <DetailRow
                  label="SMTP host"
                  value={`${conn.smtp_host}${conn.smtp_port ? `:${conn.smtp_port}` : ""}`}
                />
              )}
              <DetailRow
                label="Last health check"
                value={
                  lastCheck ? (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      {lastCheck}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Never</span>
                  )
                }
              />
              <DetailRow label="Connected on" value={new Date(conn.created_at).toLocaleDateString()} />
            </div>
          </section>

          {/* Webhook section */}
          {conn.webhook?.supports_auto && (
            <section>
              <h3 className="text-xs font-semibold tracking-wide mb-2">Event delivery</h3>
              <div className="rounded-lg border border-border/60 bg-card p-3.5">
                <WebhookSetupSection conn={conn} />
              </div>
            </section>
          )}

          {/* Security note */}
          <div className="flex items-start gap-2 rounded-lg border border-border/40 bg-muted/20 p-3">
            <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Credentials are encrypted at rest with AES-256 and never returned to the dashboard.
              To rotate, disconnect and reconnect with new keys.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-3 border-t border-border/60 bg-muted/20 sticky bottom-0">
          <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
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
