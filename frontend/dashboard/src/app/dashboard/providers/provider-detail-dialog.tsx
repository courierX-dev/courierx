"use client"

import { useState } from "react"
import {
  RefreshCw,
  ShieldCheck,
  Activity,
  Settings2,
  Webhook,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatusBadge } from "@/components/ui/status-badge"
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

type Tone = "default" | "success" | "warning" | "danger"

function StatBlock({
  label,
  value,
  hint,
  tone = "default",
  trend,
}: {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  tone?: Tone
  trend?: "up" | "down" | "flat"
}) {
  const valueClass =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : tone === "danger"
          ? "text-destructive"
          : "text-foreground"
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus
  return (
    <div className="rounded-md border bg-card px-3 py-2.5 min-w-0">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        <span className="truncate">{label}</span>
        {trend && <TrendIcon className="h-3 w-3 shrink-0" />}
      </div>
      <div className={cn("font-mono text-base mt-0.5 tabular-nums truncate", valueClass)}>
        {value}
      </div>
      {hint && (
        <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{hint}</div>
      )}
    </div>
  )
}

function ConfigRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs font-mono text-right truncate min-w-0 max-w-[65%]">{value}</span>
    </div>
  )
}

function statusKey(status: string) {
  if (status === "active") return "active"
  if (status === "degraded") return "pending"
  if (status === "inactive") return "inactive"
  return "error"
}

export function ProviderDetailDialog({ conn, onOpenChange, onVerify, isVerifying }: Props) {
  const [tab, setTab] = useState<"performance" | "configuration" | "webhook">("performance")

  if (!conn) return null

  const provider = PROVIDER_LABELS[conn.provider] ?? conn.provider
  const lastCheck = conn.last_health_check_at
    ? new Date(conn.last_health_check_at).toLocaleString()
    : null

  const hasSendData = conn.sent_count + conn.failed_count > 0
  const successPct =
    conn.success_rate != null ? `${(conn.success_rate * 100).toFixed(1)}%` : "—"
  const successTone: Tone =
    conn.success_rate == null
      ? "default"
      : conn.success_rate >= 0.98
        ? "success"
        : conn.success_rate >= 0.9
          ? "warning"
          : "danger"

  const latency = conn.avg_latency_ms != null ? `${conn.avg_latency_ms} ms` : "—"
  const latencyTone: Tone =
    conn.avg_latency_ms == null
      ? "default"
      : conn.avg_latency_ms < 500
        ? "success"
        : conn.avg_latency_ms < 1500
          ? "warning"
          : "danger"

  const failuresTone: Tone =
    conn.consecutive_failures >= 3
      ? "danger"
      : conn.consecutive_failures > 0
        ? "warning"
        : "default"

  const showWebhookTab = !!conn.webhook?.supports_auto
  const webhookNeedsAttention =
    showWebhookTab &&
    conn.webhook != null &&
    ["failed", "needs_signing_key", "not_configured", "revoked"].includes(conn.webhook.status)

  const windowLabel = `${conn.stats_window_hours ?? 24}h window`

  return (
    <Dialog open={!!conn} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden grid-cols-[minmax(0,1fr)]">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-4 border-b min-w-0">
          <div className="flex items-start gap-3 min-w-0 pr-7">
            <ProviderIcon
              provider={conn.provider}
              size={28}
              chip
              status={
                conn.status === "active"
                  ? "active"
                  : conn.status === "degraded"
                    ? "inactive"
                    : "error"
              }
            />
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-semibold truncate">
                {conn.display_name ?? provider}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[11px] text-muted-foreground">
                <span className="truncate">{provider}</span>
                <span className="opacity-50">·</span>
                <span className="uppercase tracking-wide font-medium">{conn.mode}</span>
                <span className="opacity-50">·</span>
                <span>Priority {conn.priority}</span>
              </div>
            </div>
          </div>
          <div className="mt-3">
            <StatusBadge status={statusKey(conn.status)} />
          </div>
        </DialogHeader>

        {/* Tabs */}
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as typeof tab)}
          className="w-full min-w-0"
        >
          <div className="px-5 pt-3 border-b min-w-0">
            <TabsList variant="line" className="w-full justify-start gap-3 h-9 bg-transparent p-0">
              <TabsTrigger value="performance" className="text-xs h-9 gap-1.5 px-1">
                <Activity className="h-3.5 w-3.5" />
                Performance
              </TabsTrigger>
              <TabsTrigger value="configuration" className="text-xs h-9 gap-1.5 px-1">
                <Settings2 className="h-3.5 w-3.5" />
                Configuration
              </TabsTrigger>
              {showWebhookTab && (
                <TabsTrigger value="webhook" className="text-xs h-9 gap-1.5 px-1 relative">
                  <Webhook className="h-3.5 w-3.5" />
                  Webhook
                  {webhookNeedsAttention && (
                    <span
                      aria-hidden
                      className="absolute -top-0.5 -right-1 h-1.5 w-1.5 rounded-full bg-warning"
                    />
                  )}
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <div className="px-5 py-4 max-h-[60vh] overflow-y-auto overflow-x-hidden min-w-0">
            <TabsContent
              value="performance"
              className="mt-0 space-y-4 min-w-0 data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-1 data-[state=active]:duration-200"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Live send health from this connection
                </p>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  {windowLabel}
                </span>
              </div>

              {hasSendData ? (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <StatBlock
                      label="Success"
                      value={successPct}
                      hint={`${conn.sent_count.toLocaleString()} delivered`}
                      tone={successTone}
                    />
                    <StatBlock
                      label="Latency"
                      value={latency}
                      hint="queue → sent"
                      tone={latencyTone}
                    />
                    <StatBlock
                      label="Failures"
                      value={conn.failed_count.toLocaleString()}
                      hint={
                        conn.consecutive_failures > 0
                          ? `${conn.consecutive_failures} in a row`
                          : "none recent"
                      }
                      tone={failuresTone}
                    />
                  </div>

                  {conn.consecutive_failures >= 3 && (
                    <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2.5">
                      <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-px" />
                      <p className="text-[11px] text-destructive leading-relaxed">
                        {conn.consecutive_failures} consecutive failures — this provider is at
                        risk of being skipped by the routing failover chain.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-md border border-dashed bg-muted/20 px-4 py-6 text-center">
                  <Activity className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium">No sends yet</p>
                  <p className="text-[11px] text-muted-foreground mt-1 max-w-65 mx-auto leading-relaxed">
                    Performance metrics appear once this provider handles email traffic in the
                    last {conn.stats_window_hours ?? 24}&nbsp;hours.
                  </p>
                  {conn.consecutive_failures > 0 && (
                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-warning/30 bg-warning/10 px-2 py-1 text-[11px] text-warning">
                      <AlertCircle className="h-3 w-3" />
                      {conn.consecutive_failures} health-check failure
                      {conn.consecutive_failures === 1 ? "" : "s"}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent
              value="configuration"
              className="mt-0 space-y-3 min-w-0 data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-1 data-[state=active]:duration-200"
            >
              <div className="rounded-md border bg-card px-3.5">
                <ConfigRow label="Priority" value={conn.priority} />
                <ConfigRow label="Weight" value={conn.weight} />
                {conn.region && <ConfigRow label="Region" value={conn.region} />}
                {conn.smtp_host && (
                  <ConfigRow
                    label="SMTP host"
                    value={`${conn.smtp_host}${conn.smtp_port ? `:${conn.smtp_port}` : ""}`}
                  />
                )}
                <ConfigRow
                  label="Last health check"
                  value={lastCheck ?? <span className="text-muted-foreground">Never</span>}
                />
                <ConfigRow
                  label="Connected on"
                  value={new Date(conn.created_at).toLocaleDateString()}
                />
              </div>

              <div className="flex items-start gap-2 rounded-md border bg-muted/20 p-3">
                <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Credentials are encrypted at rest with AES-256 and never returned to the
                  dashboard. To rotate, disconnect and reconnect with new keys.
                </p>
              </div>
            </TabsContent>

            {showWebhookTab && (
              <TabsContent
                value="webhook"
                className="mt-0 min-w-0 data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-1 data-[state=active]:duration-200"
              >
                <WebhookSetupSection conn={conn} />
              </TabsContent>
            )}
          </div>
        </Tabs>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t bg-muted/20">
          <Button
            size="sm"
            variant="outline"
            onClick={onVerify}
            disabled={isVerifying}
            className="gap-1.5"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isVerifying && "animate-spin")} />
            Re-verify credentials
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
