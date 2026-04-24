"use client"

import { useState } from "react"
import { Plus, Server, RefreshCw, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageShell } from "@/components/dashboard/page-shell"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionError } from "@/components/dashboard/inline-error"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  useProviderConnections,
  useDeleteProviderConnection,
  useVerifyProviderConnection,
} from "@/hooks/use-providers"
import type { ProviderConnection } from "@/services/providers.service"
import { ProviderIcon } from "@/components/ui/provider-icon"
import { ConnectProviderDialog } from "./connect-provider-dialog"
import { ProviderDetailDialog } from "./provider-detail-dialog"

const PROVIDER_LABELS: Record<string, string> = {
  sendgrid: "SendGrid",
  mailgun: "Mailgun",
  ses: "Amazon SES",
  aws_ses: "Amazon SES",
  smtp: "SMTP",
  postmark: "Postmark",
  resend: "Resend",
}

const PROVIDER_TYPES: Record<string, string> = {
  sendgrid: "API Gateway",
  mailgun: "API Gateway",
  ses: "Cloud Service",
  aws_ses: "Cloud Service",
  smtp: "Direct SMTP",
  postmark: "API Gateway",
  resend: "API Gateway",
}

function providerLabel(provider: string) {
  return PROVIDER_LABELS[provider] ?? provider
}

function ProviderCard({
  conn,
  onVerify,
  onDelete,
  onOpen,
  isVerifying,
  isDeleting,
}: {
  conn: ProviderConnection
  onVerify: () => void
  onDelete: () => void
  onOpen: () => void
  isVerifying: boolean
  isDeleting: boolean
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const connected = conn.status === "active"
  const successPct = conn.success_rate != null ? `${(conn.success_rate * 100).toFixed(1)}%` : "\u2014"
  const latency = conn.avg_latency_ms != null ? `${conn.avg_latency_ms} ms` : "\u2014"
  const lastCheck = conn.last_health_check_at
    ? new Date(conn.last_health_check_at).toLocaleString()
    : "Never checked"

  return (
    <div
      onClick={onOpen}
      className="bg-card border border-border rounded-xl shadow-card p-5 cursor-pointer hover:border-foreground/20 transition-colors"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <ProviderIcon provider={conn.provider} size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-foreground">
            {conn.display_name ?? providerLabel(conn.provider)}
          </div>
          <div className="text-xs text-muted-foreground mt-[1px]">
            {PROVIDER_TYPES[conn.provider] ?? "Provider"}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {conn.priority === 1 && (
            <span className="text-[11px] font-medium px-2 py-[2px] rounded-full bg-[#EFF6FF] text-primary border border-[#BFDBFE] dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800">
              Default
            </span>
          )}
          <span
            className={cn(
              "text-[11px] font-medium px-2 py-[2px] rounded-full border",
              connected
                ? "bg-[#ECFDF5] text-[#10B981] border-[#A7F3D0] dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800"
                : "bg-[#FEF2F2] text-destructive border-[#FECACA] dark:bg-red-950 dark:text-red-400 dark:border-red-800"
            )}
          >
            {connected ? "Connected" : "Error"}
          </span>
        </div>
      </div>

      {/* Operational summary */}
      <div className="grid grid-cols-3 gap-2 bg-background border border-border rounded-lg px-3 py-2 mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Success</div>
          <div className="font-mono text-xs">{successPct}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Latency</div>
          <div className="font-mono text-xs">{latency}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Failures</div>
          <div className={cn(
            "font-mono text-xs",
            conn.consecutive_failures > 0 ? "text-destructive" : "",
          )}>{conn.consecutive_failures}</div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 mb-3 text-[11px] text-muted-foreground">
        <Activity className="h-3 w-3" />
        <span>Last check {lastCheck}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onVerify}
          disabled={isVerifying}
          className="text-xs font-medium px-[10px] py-[5px] rounded-[7px] border border-border bg-card text-foreground/80 hover:bg-muted transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          <RefreshCw className={cn("h-3 w-3", isVerifying && "animate-spin")} />
          Verify
        </button>
        {confirmDelete ? (
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-xs text-muted-foreground">Disconnect?</span>
            <button
              onClick={() => setConfirmDelete(false)}
              disabled={isDeleting}
              className="text-xs font-medium px-[10px] py-[5px] rounded-[7px] border border-border bg-card text-foreground/80 hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className="text-xs font-medium px-[10px] py-[5px] rounded-[7px] border border-[#FECACA] bg-[#FEF2F2] text-destructive hover:bg-red-100 transition-colors disabled:opacity-50 dark:bg-red-950 dark:border-red-800"
            >
              {isDeleting ? "Removing..." : "Remove"}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-xs font-medium px-[10px] py-[5px] rounded-[7px] border border-[#FECACA] bg-[#FEF2F2] text-destructive hover:bg-red-100 transition-colors ml-auto dark:bg-red-950 dark:border-red-800"
          >
            Disconnect
          </button>
        )}
      </div>
    </div>
  )
}

export default function ProvidersPage() {
  const { data: connections, isLoading, isError, refetch } = useProviderConnections()
  const deleteMutation = useDeleteProviderConnection()
  const verifyMutation = useVerifyProviderConnection()
  const [connectOpen, setConnectOpen] = useState(false)
  const [verifyingId, setVerifyingId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ProviderConnection | null>(null)

  async function handleDelete(conn: ProviderConnection) {
    try {
      await deleteMutation.mutateAsync(conn.id)
      toast.success("Provider disconnected", { description: providerLabel(conn.provider) })
    } catch {
      toast.error("Failed to disconnect provider")
    }
  }

  async function handleVerify(conn: ProviderConnection) {
    setVerifyingId(conn.id)
    try {
      const result = await verifyMutation.mutateAsync(conn.id)
      if (result.verification?.verified) {
        toast.success("Credentials verified", { description: providerLabel(conn.provider) })
      } else {
        toast.error("Verification failed", {
          description: result.verification?.error ?? "Check your credentials.",
        })
      }
    } catch {
      toast.error("Verification check failed")
    } finally {
      setVerifyingId(null)
    }
  }

  if (isLoading) {
    return (
      <PageShell>
        <PageHeader title="Providers" subtitle="Connect your email provider accounts" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-[180px] rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </PageShell>
    )
  }

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
        <Button size="sm" className="h-8 gap-1.5 rounded-lg" onClick={() => setConnectOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Connect provider
        </Button>
      </PageHeader>

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {providers.map((conn) => (
            <ProviderCard
              key={conn.id}
              conn={conn}
              onVerify={() => handleVerify(conn)}
              onDelete={() => handleDelete(conn)}
              onOpen={() => setDetail(conn)}
              isVerifying={verifyingId === conn.id}
              isDeleting={deleteMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* BYOK info */}
      <div className="rounded-xl border border-border/60 bg-muted/30 px-5 py-4 text-xs text-muted-foreground space-y-2">
        <p className="font-semibold text-foreground">Bring your own keys</p>
        <p>
          Provider credentials are encrypted at rest with AES-256 and verified server-side.
          CourierX never stores or logs your raw API keys.
        </p>
        <p className="font-semibold text-foreground pt-1">Multi-provider DNS setup</p>
        <p>
          When using multiple providers, use a <span className="font-mono text-foreground">subdomain per provider</span> to
          avoid DKIM record conflicts. For example: <span className="font-mono text-foreground">mail.example.com</span> for
          SendGrid and <span className="font-mono text-foreground">mg.example.com</span> for Mailgun.
        </p>
      </div>

      <ConnectProviderDialog open={connectOpen} onOpenChange={setConnectOpen} />

      <ProviderDetailDialog
        conn={detail}
        onOpenChange={(o) => !o && setDetail(null)}
        onVerify={() => detail && handleVerify(detail)}
        isVerifying={!!detail && verifyingId === detail.id}
      />
    </PageShell>
  )
}
