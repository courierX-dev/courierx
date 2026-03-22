"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useCreateProviderConnection } from "@/hooks/use-providers"
import type { CreateProviderConnectionRequest } from "@/services/providers.service"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ProviderType = "sendgrid" | "mailgun" | "ses" | "smtp" | "postmark" | "resend"

const PROVIDERS: { id: ProviderType; name: string; description: string }[] = [
  { id: "sendgrid", name: "SendGrid", description: "Twilio SendGrid API" },
  { id: "mailgun",  name: "Mailgun",  description: "Sinch Mailgun API" },
  { id: "ses",      name: "Amazon SES", description: "AWS Simple Email Service" },
  { id: "postmark", name: "Postmark", description: "ActiveCampaign Postmark" },
  { id: "resend",   name: "Resend",   description: "Resend Email API" },
  { id: "smtp",     name: "SMTP",     description: "Generic SMTP server" },
]

const AWS_REGIONS = [
  "us-east-1", "us-east-2", "us-west-1", "us-west-2",
  "eu-west-1", "eu-west-2", "eu-central-1",
  "ap-southeast-1", "ap-southeast-2", "ap-northeast-1",
]

export function ConnectProviderDialog({ open, onOpenChange }: Props) {
  const mutation = useCreateProviderConnection()
  const [step, setStep] = useState<"select" | "credentials">("select")
  const [selected, setSelected] = useState<ProviderType | null>(null)
  const [form, setForm] = useState({
    display_name: "",
    api_key: "",
    secret: "",
    smtp_host: "",
    smtp_port: "",
    region: "",
  })
  const [error, setError] = useState("")

  function reset() {
    setStep("select")
    setSelected(null)
    setForm({ display_name: "", api_key: "", secret: "", smtp_host: "", smtp_port: "", region: "" })
    setError("")
  }

  function handleClose(open: boolean) {
    if (!open) reset()
    onOpenChange(open)
  }

  function handleSelect(provider: ProviderType) {
    setSelected(provider)
    setStep("credentials")
  }

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!selected) return

    const payload: CreateProviderConnectionRequest = { provider: selected }
    if (form.display_name) payload.display_name = form.display_name

    switch (selected) {
      case "sendgrid":
      case "postmark":
      case "resend":
        payload.api_key = form.api_key
        break
      case "mailgun":
        payload.api_key = form.api_key
        payload.smtp_host = form.smtp_host
        payload.region = form.region || "us"
        break
      case "ses":
        payload.api_key = form.api_key
        payload.secret = form.secret
        payload.region = form.region
        break
      case "smtp":
        payload.smtp_host = form.smtp_host
        payload.smtp_port = parseInt(form.smtp_port, 10) || 587
        payload.api_key = form.api_key
        payload.secret = form.secret
        break
    }

    try {
      await mutation.mutateAsync(payload)
      toast.success("Provider connected", { description: PROVIDERS.find((p) => p.id === selected)?.name })
      handleClose(false)
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { error?: string; errors?: string[] } } }
      setError(apiErr.response?.data?.errors?.[0] ?? apiErr.response?.data?.error ?? "Failed to connect provider.")
    }
  }

  const providerMeta = PROVIDERS.find((p) => p.id === selected)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === "select" ? "Connect provider" : `Connect ${providerMeta?.name}`}
          </DialogTitle>
          <DialogDescription>
            {step === "select"
              ? "Choose an email provider to connect your account."
              : "Enter your API credentials. They are encrypted at rest."}
          </DialogDescription>
        </DialogHeader>

        {step === "select" ? (
          <div className="grid grid-cols-2 gap-2 mt-2">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelect(p.id)}
                className={cn(
                  "flex flex-col items-start rounded-lg border border-border p-3 text-left transition-colors",
                  "hover:bg-muted/40 hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30",
                )}
              >
                <span className="text-sm font-medium">{p.name}</span>
                <span className="text-[11px] text-muted-foreground mt-0.5">{p.description}</span>
              </button>
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {/* Display name (optional, all providers) */}
            <div className="space-y-1.5">
              <Label htmlFor="display_name">Display name <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                id="display_name"
                placeholder={`My ${providerMeta?.name} account`}
                value={form.display_name}
                onChange={set("display_name")}
              />
            </div>

            {/* Provider-specific fields */}
            {(selected === "sendgrid" || selected === "postmark" || selected === "resend") && (
              <div className="space-y-1.5">
                <Label htmlFor="api_key">API Key *</Label>
                <Input
                  id="api_key"
                  type="password"
                  placeholder={selected === "postmark" ? "Server token" : "API key"}
                  value={form.api_key}
                  onChange={set("api_key")}
                  required
                  autoComplete="off"
                />
              </div>
            )}

            {selected === "mailgun" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="api_key">API Key *</Label>
                  <Input id="api_key" type="password" placeholder="key-..." value={form.api_key} onChange={set("api_key")} required autoComplete="off" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="smtp_host">Sending domain *</Label>
                  <Input id="smtp_host" placeholder="mg.example.com" value={form.smtp_host} onChange={set("smtp_host")} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="region">Region</Label>
                  <Select value={form.region || "us"} onValueChange={(v) => setForm((f) => ({ ...f, region: v }))}>
                    <SelectTrigger id="region"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="us">US</SelectItem>
                      <SelectItem value="eu">EU</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {selected === "ses" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="api_key">Access Key ID *</Label>
                  <Input id="api_key" type="password" placeholder="AKIA..." value={form.api_key} onChange={set("api_key")} required autoComplete="off" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="secret">Secret Access Key *</Label>
                  <Input id="secret" type="password" placeholder="Secret key" value={form.secret} onChange={set("secret")} required autoComplete="off" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="region">AWS Region *</Label>
                  <Select value={form.region} onValueChange={(v) => setForm((f) => ({ ...f, region: v }))}>
                    <SelectTrigger id="region"><SelectValue placeholder="Select region" /></SelectTrigger>
                    <SelectContent>
                      {AWS_REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {selected === "smtp" && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="smtp_host">Host *</Label>
                    <Input id="smtp_host" placeholder="smtp.example.com" value={form.smtp_host} onChange={set("smtp_host")} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="smtp_port">Port *</Label>
                    <Input id="smtp_port" type="number" placeholder="587" value={form.smtp_port} onChange={set("smtp_port")} required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="api_key">Username *</Label>
                  <Input id="api_key" placeholder="SMTP username" value={form.api_key} onChange={set("api_key")} required autoComplete="off" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="secret">Password *</Label>
                  <Input id="secret" type="password" placeholder="SMTP password" value={form.secret} onChange={set("secret")} required autoComplete="off" />
                </div>
              </>
            )}

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="flex justify-between pt-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => setStep("select")}>
                Back
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => handleClose(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={mutation.isPending}>
                  {mutation.isPending ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Connecting…</> : "Connect"}
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
