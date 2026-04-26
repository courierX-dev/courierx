"use client"

import { useState } from "react"
import { Check, Copy, RefreshCw, AlertCircle, ShieldCheck, Webhook } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  useResyncProviderWebhook,
  useUpdateProviderConnection,
} from "@/hooks/use-providers"
import type {
  ProviderConnection,
  ProviderWebhookSummary,
  WebhookStatus,
} from "@/services/providers.service"

const STATUS_COPY: Record<
  WebhookStatus,
  { label: string; tone: "ok" | "warn" | "err" | "muted"; description: string }
> = {
  auto: {
    label: "Auto-synced",
    tone: "ok",
    description:
      "We registered the webhook on your provider account. Delivery, bounce, and engagement events flow back automatically.",
  },
  manual: {
    label: "Manual",
    tone: "warn",
    description:
      "You configured this webhook manually. Switch to auto-managed and we'll keep the URL and signing secret in sync for you.",
  },
  needs_signing_key: {
    label: "Action needed",
    tone: "warn",
    description:
      "We registered the webhook URL but couldn't auto-fetch the signing key. Paste it below to enable verification.",
  },
  failed: {
    label: "Failed",
    tone: "err",
    description: "Auto setup failed. We'll retry next time you save credentials, or click Resync.",
  },
  not_configured: {
    label: "Not configured",
    tone: "muted",
    description: "Webhooks are not yet set up for this connection.",
  },
  revoked: {
    label: "Revoked",
    tone: "muted",
    description: "Webhook was disconnected. Click Resync to set it back up.",
  },
}

const TONE_CLASSES: Record<"ok" | "warn" | "err" | "muted", string> = {
  ok: "bg-[#ECFDF5] text-[#10B981] border-[#A7F3D0] dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800",
  warn: "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A] dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
  err: "bg-[#FEF2F2] text-destructive border-[#FECACA] dark:bg-red-950 dark:text-red-400 dark:border-red-800",
  muted: "bg-muted text-muted-foreground border-border",
}

export function WebhookSetupSection({ conn }: { conn: ProviderConnection }) {
  const wh = conn.webhook
  const resync = useResyncProviderWebhook()
  const updateConn = useUpdateProviderConnection()

  const [copied, setCopied] = useState(false)
  const [secretInput, setSecretInput] = useState("")
  const [showSecretField, setShowSecretField] = useState(
    wh?.status === "needs_signing_key" || (wh?.status === "manual" && !wh.secret_present),
  )

  // SES / SMTP — no auto path, hide the whole section.
  if (!wh || !wh.supports_auto) return null

  const copy = STATUS_COPY[wh.status]

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success("Copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleResync() {
    try {
      await resync.mutateAsync(conn.id)
      toast.success("Webhook setup queued")
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { errors?: string[] } } }
      toast.error(apiErr.response?.data?.errors?.[0] ?? "Couldn't queue webhook setup")
    }
  }

  async function handleSwitchToAuto() {
    try {
      await updateConn.mutateAsync({
        id: conn.id,
        payload: { webhook_auto_managed: true },
      })
      toast.success("Switched to auto-managed")
    } catch {
      toast.error("Couldn't switch to auto-managed")
    }
  }

  async function handleSaveSecret() {
    if (!secretInput.trim()) return
    try {
      await updateConn.mutateAsync({
        id: conn.id,
        payload: { webhook_secret: secretInput.trim() },
      })
      toast.success("Signing secret saved")
      setSecretInput("")
      setShowSecretField(false)
    } catch {
      toast.error("Couldn't save signing secret")
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Webhook className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Event webhook</span>
        </div>
        <span
          className={cn(
            "text-[11px] font-medium px-2 py-[2px] rounded-full border",
            TONE_CLASSES[copy.tone],
          )}
          aria-label={`Webhook status: ${copy.label}`}
        >
          {copy.label}
        </span>
      </div>

      <p className="text-xs text-muted-foreground">{copy.description}</p>

      {wh.url && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-2 py-1.5">
          <span className="text-[11px] text-muted-foreground shrink-0">URL</span>
          <code className="flex-1 truncate font-mono text-[11px]">{wh.url}</code>
          <button
            type="button"
            onClick={() => handleCopy(wh.url!)}
            aria-label="Copy webhook URL"
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}

      {wh.last_error && (
        <div className="flex items-start gap-2 rounded-md border border-[#FECACA] bg-[#FEF2F2] px-2 py-1.5 text-[11px] text-destructive dark:bg-red-950 dark:border-red-800 dark:text-red-400">
          <AlertCircle className="h-3.5 w-3.5 mt-px shrink-0" />
          <span className="font-mono">{wh.last_error}</span>
        </div>
      )}

      <PasteSecretField
        visible={showSecretField}
        value={secretInput}
        onChange={setSecretInput}
        onSave={handleSaveSecret}
        onCancel={() => {
          setSecretInput("")
          setShowSecretField(false)
        }}
        saving={updateConn.isPending}
      />

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Actions
          summary={wh}
          resyncing={resync.isPending}
          updating={updateConn.isPending}
          onResync={handleResync}
          onSwitchToAuto={handleSwitchToAuto}
          onPaste={() => setShowSecretField(true)}
        />
      </div>

      {wh.last_synced_at && (
        <p className="text-[10px] text-muted-foreground">
          Last synced {new Date(wh.last_synced_at).toLocaleString()}
        </p>
      )}
    </div>
  )
}

function PasteSecretField({
  visible,
  value,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  visible: boolean
  value: string
  onChange: (v: string) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
}) {
  if (!visible) return null
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-medium text-muted-foreground">
        Paste signing secret
      </label>
      <div className="flex gap-1.5">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="whsec_…"
          className="font-mono text-xs h-8"
        />
        <Button size="sm" className="h-8" disabled={!value.trim() || saving} onClick={onSave}>
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button size="sm" variant="ghost" className="h-8" disabled={saving} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

function Actions({
  summary,
  resyncing,
  updating,
  onResync,
  onSwitchToAuto,
  onPaste,
}: {
  summary: ProviderWebhookSummary
  resyncing: boolean
  updating: boolean
  onResync: () => void
  onSwitchToAuto: () => void
  onPaste: () => void
}) {
  const showResync = summary.status !== "manual" || summary.auto_managed
  const showSwitch = summary.status === "manual" && !summary.auto_managed
  const showPaste = summary.status === "needs_signing_key" || summary.status === "manual"

  return (
    <>
      {showSwitch && (
        <Button size="sm" className="h-8 gap-1.5" disabled={updating} onClick={onSwitchToAuto}>
          <ShieldCheck className="h-3.5 w-3.5" />
          {updating ? "Switching…" : "Switch to auto-managed"}
        </Button>
      )}
      {showResync && (
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5"
          disabled={resyncing}
          onClick={onResync}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", resyncing && "animate-spin")} />
          {resyncing ? "Queuing…" : "Resync"}
        </Button>
      )}
      {showPaste && (
        <Button size="sm" variant="ghost" className="h-8" onClick={onPaste}>
          Paste signing secret
        </Button>
      )}
    </>
  )
}
