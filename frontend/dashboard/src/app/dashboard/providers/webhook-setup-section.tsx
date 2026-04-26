"use client"

import { useEffect, useRef, useState } from "react"
import {
  Check,
  Copy,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  Webhook,
  Loader2,
  Info,
} from "lucide-react"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
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

const PROVIDER_NAMES: Record<string, string> = {
  resend: "Resend",
  postmark: "Postmark",
  sendgrid: "SendGrid",
  mailgun: "Mailgun",
}

// Where the user finds their signing key, when we couldn't fetch it for them.
const SIGNING_KEY_HINTS: Record<string, { label: string; url: string }> = {
  mailgun: {
    label: "Mailgun → Sending → Webhooks → HTTP webhook signing key",
    url: "https://app.mailgun.com/app/sending/webhooks",
  },
  sendgrid: {
    label: "SendGrid → Settings → Mail Settings → Signed Event Webhook",
    url: "https://app.sendgrid.com/settings/mail_settings",
  },
  resend: {
    label: "Resend → Webhooks → your webhook → Signing Secret",
    url: "https://resend.com/webhooks",
  },
}

function statusCopy(
  status: WebhookStatus,
  providerName: string,
  recentlyQueued: boolean,
): {
  label: string
  tone: "ok" | "warn" | "err" | "muted" | "pending"
  description: string
} {
  // If the user just clicked Resync and the row hasn't refreshed yet,
  // override the stale status with a clear pending message.
  if (recentlyQueued && status !== "auto") {
    return {
      label: "Setting up…",
      tone: "pending",
      description: `Asking ${providerName} to point its webhooks at CourierX. This usually finishes in a few seconds.`,
    }
  }

  switch (status) {
    case "auto":
      return {
        label: "Connected",
        tone: "ok",
        description: `${providerName} is reporting delivery, bounces, opens, and clicks back to CourierX. Nothing else to do.`,
      }
    case "manual":
      return {
        label: "Manual",
        tone: "warn",
        description:
          "A webhook is configured, but we're not the ones managing it. Let CourierX take over and we'll keep the URL and signing secret in sync for you.",
      }
    case "needs_signing_key":
      return {
        label: "One step left",
        tone: "warn",
        description: `We registered the webhook URL with ${providerName}, but we couldn't auto-fetch the signing key. Paste it below — that's the last step.`,
      }
    case "failed":
      return {
        label: "Setup failed",
        tone: "err",
        description: `${providerName} rejected the request. See the error below — usually the API key is missing a permission or the credentials are wrong. Click Try again after fixing.`,
      }
    case "revoked":
      return {
        label: "Disconnected",
        tone: "muted",
        description: `The webhook was disconnected from ${providerName}. Click Set up automatically to put it back.`,
      }
    case "not_configured":
    default:
      return {
        label: "Not set up",
        tone: "muted",
        description: `Webhooks tell CourierX when emails are delivered, bounce, or get opened. Click Set up automatically and we'll register the webhook on your ${providerName} account for you.`,
      }
  }
}

const TONE_CLASSES: Record<"ok" | "warn" | "err" | "muted" | "pending", string> = {
  ok: "bg-[#ECFDF5] text-[#10B981] border-[#A7F3D0] dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800",
  warn: "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A] dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
  err: "bg-[#FEF2F2] text-destructive border-[#FECACA] dark:bg-red-950 dark:text-red-400 dark:border-red-800",
  muted: "bg-muted text-muted-foreground border-border",
  pending:
    "bg-[#EFF6FF] text-primary border-[#BFDBFE] dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
}

export function WebhookSetupSection({ conn }: { conn: ProviderConnection }) {
  const wh = conn.webhook
  const resync = useResyncProviderWebhook()
  const updateConn = useUpdateProviderConnection()
  const qc = useQueryClient()

  const [copied, setCopied] = useState(false)
  const [secretInput, setSecretInput] = useState("")
  const [showSecretField, setShowSecretField] = useState(false)
  const [recentlyQueued, setRecentlyQueued] = useState(false)
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  // After the user clicks resync we don't get a synchronous result — the
  // Sidekiq job runs out of band. Refetch the connections every 2s for up
  // to 30s so the dialog reflects the new status without manual refresh.
  useEffect(() => {
    if (!recentlyQueued) return
    pollTimer.current = setInterval(() => {
      qc.invalidateQueries({ queryKey: ["providerConnections"] })
    }, 2000)
    const stopAt = setTimeout(() => setRecentlyQueued(false), 30000)
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current)
      clearTimeout(stopAt)
    }
  }, [recentlyQueued, qc])

  // Note: we don't proactively stop polling when the status flips to a
  // terminal state — the copy logic handles the visual transition correctly,
  // and the 30s timeout cleans up. Refetching for a few extra seconds against
  // a healthy connection is cheap and harmless.

  if (!wh || !wh.supports_auto) return null

  const providerName = PROVIDER_NAMES[conn.provider] ?? conn.provider
  const copy = statusCopy(wh.status, providerName, recentlyQueued)
  const signingHint = SIGNING_KEY_HINTS[conn.provider]

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success("Copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleResync() {
    try {
      await resync.mutateAsync(conn.id)
      setRecentlyQueued(true)
      toast.success(`Setting up webhook on ${providerName}…`)
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
      setRecentlyQueued(true)
      toast.success("Switching to managed setup…")
    } catch {
      toast.error("Couldn't switch to managed setup")
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
      {/* Header — always visible, explains *what* this is. */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Webhook className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Event webhook</span>
        </div>
        <span
          className={cn(
            "shrink-0 text-[11px] font-medium px-2 py-[2px] rounded-full border inline-flex items-center gap-1",
            TONE_CLASSES[copy.tone],
          )}
          aria-label={`Webhook status: ${copy.label}`}
        >
          {copy.tone === "pending" && <Loader2 className="h-3 w-3 animate-spin" />}
          {copy.label}
        </span>
      </div>

      {/* What this is — only show on the "not yet" states. Once set up, the
          status pill + URL row tell the whole story. */}
      {(wh.status === "not_configured" || wh.status === "revoked") && (
        <div className="flex items-start gap-2 rounded-md border border-border/60 bg-muted/20 p-2.5 text-[11px] text-muted-foreground">
          <Info className="h-3.5 w-3.5 mt-px shrink-0" />
          <p>
            Without a webhook, the dashboard will show emails as <span className="font-mono">sent</span>{" "}
            but never as <span className="font-mono">delivered</span>, <span className="font-mono">bounced</span>, or{" "}
            <span className="font-mono">opened</span>. {providerName} signs every event so we can verify it really came from them.
          </p>
        </div>
      )}

      <p className="text-xs text-muted-foreground leading-relaxed">{copy.description}</p>

      {wh.url && wh.status === "auto" && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-2 py-1.5">
          <span className="text-[11px] text-muted-foreground shrink-0">Endpoint</span>
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

      {wh.last_error && wh.status === "failed" && (
        <ErrorBanner
          message={wh.last_error}
          providerName={providerName}
        />
      )}

      <PasteSecretField
        visible={
          showSecretField ||
          (wh.status === "needs_signing_key" && !wh.secret_present)
        }
        provider={providerName}
        hint={signingHint}
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
          providerName={providerName}
          resyncing={resync.isPending || recentlyQueued}
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

function ErrorBanner({
  message,
  providerName,
}: {
  message: string
  providerName: string
}) {
  // Backend prefixes its own non-provider errors with [config] / [credentials]
  // so we can show actionable, category-specific copy.
  const tagged = message.match(/^\[(config|credentials)\]\s*(.+)$/)
  const category = tagged?.[1] ?? "provider"
  const body = tagged?.[2] ?? message

  const heading =
    category === "config"
      ? "Server isn't configured for webhooks yet"
      : category === "credentials"
        ? "Provider credentials aren't set yet"
        : `${providerName} rejected the request`

  const followUp =
    category === "config"
      ? "This is a CourierX-side setup issue, not a Resend / Mailgun / SendGrid problem. Once your admin sets the env var on the worker process and redeploys, click Try again."
      : category === "credentials"
        ? "Add or fix the API key on this connection, then click Try again."
        : `Usually this means the API key is missing a permission or is wrong. After fixing, click Try again.`

  return (
    <div className="flex items-start gap-2 rounded-md border border-[#FECACA] bg-[#FEF2F2] px-2.5 py-2 text-[11px] text-destructive dark:bg-red-950 dark:border-red-800 dark:text-red-400">
      <AlertCircle className="h-3.5 w-3.5 mt-px shrink-0" />
      <div className="space-y-1">
        <div className="font-semibold">{heading}</div>
        <div className="font-mono wrap-break-word">{body}</div>
        <div className="text-[10px] opacity-80 leading-relaxed">{followUp}</div>
      </div>
    </div>
  )
}

function PasteSecretField({
  visible,
  provider,
  hint,
  value,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  visible: boolean
  provider: string
  hint?: { label: string; url: string }
  value: string
  onChange: (v: string) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
}) {
  if (!visible) return null
  return (
    <div className="space-y-1.5 rounded-md border border-[#FDE68A] bg-[#FFFBEB] p-2.5 dark:bg-amber-950/40 dark:border-amber-800">
      <label className="text-[11px] font-medium text-[#92400E] dark:text-amber-300">
        Paste {provider} signing key
      </label>
      {hint && (
        <p className="text-[11px] text-[#92400E]/80 dark:text-amber-300/80">
          Find it at{" "}
          <a
            href={hint.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-medium"
          >
            {hint.label}
          </a>
        </p>
      )}
      <div className="flex gap-1.5">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="whsec_… or signing key"
          className="font-mono text-xs h-8 bg-card"
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
  providerName,
  resyncing,
  updating,
  onResync,
  onSwitchToAuto,
  onPaste,
}: {
  summary: ProviderWebhookSummary
  providerName: string
  resyncing: boolean
  updating: boolean
  onResync: () => void
  onSwitchToAuto: () => void
  onPaste: () => void
}) {
  // The primary CTA depends on status — only show one prominent button.
  const status = summary.status

  if (status === "manual" && !summary.auto_managed) {
    return (
      <Button size="sm" className="h-8 gap-1.5" disabled={updating} onClick={onSwitchToAuto}>
        <ShieldCheck className="h-3.5 w-3.5" />
        {updating ? "Switching…" : `Let CourierX manage ${providerName}`}
      </Button>
    )
  }

  if (status === "auto") {
    return (
      <Button
        size="sm"
        variant="outline"
        className="h-8 gap-1.5"
        disabled={resyncing}
        onClick={onResync}
      >
        <RefreshCw className={cn("h-3.5 w-3.5", resyncing && "animate-spin")} />
        {resyncing ? "Refreshing…" : "Refresh"}
      </Button>
    )
  }

  if (status === "needs_signing_key") {
    return (
      <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={onPaste}>
        Paste signing key
      </Button>
    )
  }

  // not_configured / failed / revoked — primary action is "set it up".
  return (
    <Button size="sm" className="h-8 gap-1.5" disabled={resyncing} onClick={onResync}>
      <RefreshCw className={cn("h-3.5 w-3.5", resyncing && "animate-spin")} />
      {resyncing
        ? "Setting up…"
        : status === "failed"
          ? "Try again"
          : "Set up automatically"}
    </Button>
  )
}
