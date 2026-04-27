"use client"

import { useState } from "react"
import { Loader2, ExternalLink, CheckCircle2, XCircle, ArrowLeft, ShieldCheck, Lightbulb } from "lucide-react"
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
import { ProviderIcon } from "@/components/ui/provider-icon"

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

const SETUP_GUIDES: Record<ProviderType, { steps: string[]; docsUrl: string; subdomainExample: string }> = {
  sendgrid: {
    steps: [
      "Sign up at sendgrid.com and complete sender verification.",
      "Go to Settings → API Keys → Create API Key.",
      "Choose \"Full Access\" or \"Restricted Access\" with Mail Send permissions.",
      "Copy the key — it is only shown once.",
    ],
    docsUrl: "https://docs.sendgrid.com/ui/account-and-settings/api-keys",
    subdomainExample: "mail.yourdomain.com",
  },
  mailgun: {
    steps: [
      "Sign up at mailgun.com and add a sending domain.",
      "Go to Sending → Domains → Add New Domain.",
      "Use a subdomain like mg.yourdomain.com (recommended).",
      "Go to Settings → API Security → Create API Key.",
    ],
    docsUrl: "https://documentation.mailgun.com/docs/mailgun/api-reference/openapi-final/tag/Domains/",
    subdomainExample: "mg.yourdomain.com",
  },
  ses: {
    steps: [
      "Open the AWS Console → SES → Verified Identities.",
      "Verify a domain (use a subdomain like ses.yourdomain.com).",
      "Go to IAM → Create a user with AmazonSESFullAccess policy.",
      "Generate Access Key ID and Secret Access Key for that user.",
    ],
    docsUrl: "https://docs.aws.amazon.com/ses/latest/dg/setting-up.html",
    subdomainExample: "ses.yourdomain.com",
  },
  postmark: {
    steps: [
      "Sign up at postmarkapp.com and create a Server.",
      "Go to your Server → Settings → API Tokens.",
      "Copy the Server API Token.",
      "Add and verify a Sender Signature or domain.",
    ],
    docsUrl: "https://postmarkapp.com/developer/api/overview",
    subdomainExample: "pm.yourdomain.com",
  },
  resend: {
    steps: [
      "Sign up at resend.com and verify your email.",
      "Go to Domains → Add Domain and verify DNS records.",
      "Go to API Keys → Create API Key.",
      "Copy the key — it starts with re_.",
    ],
    docsUrl: "https://resend.com/docs/dashboard/api-keys/introduction",
    subdomainExample: "send.yourdomain.com",
  },
  smtp: {
    steps: [
      "Get your SMTP server hostname and port from your email provider.",
      "Common ports: 587 (STARTTLS) or 465 (implicit TLS).",
      "Get the SMTP username and password (often your email and app password).",
      "Make sure outbound SMTP is not blocked by your firewall.",
    ],
    docsUrl: "",
    subdomainExample: "",
  },
}

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
  const [verifyResult, setVerifyResult] = useState<{ verified: boolean; error?: string } | null>(null)

  function reset() {
    setStep("select")
    setSelected(null)
    setForm({ display_name: "", api_key: "", secret: "", smtp_host: "", smtp_port: "", region: "" })
    setError("")
    setVerifyResult(null)
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
    setVerifyResult(null)
    if (!selected) return

    const payload: CreateProviderConnectionRequest = {
      provider: selected === "ses" ? "aws_ses" : selected,
      mode: "byok",
      weight: 1,
    }
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
      const result = await mutation.mutateAsync(payload)
      const verification = result.verification
      if (verification) {
        setVerifyResult(verification)
      }
      if (verification?.verified) {
        toast.success("Provider connected and verified", {
          description: PROVIDERS.find((p) => p.id === selected)?.name,
        })
        handleClose(false)
      } else {
        toast.warning("Provider saved but verification failed", {
          description: verification?.error ?? "Check your credentials and try again.",
        })
      }
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { error?: string; errors?: string[] } } }
      setError(apiErr.response?.data?.errors?.[0] ?? apiErr.response?.data?.error ?? "Failed to connect provider.")
    }
  }

  const providerMeta = PROVIDERS.find((p) => p.id === selected)
  const guide = selected ? SETUP_GUIDES[selected] : null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-border/60">
          {step === "select" ? (
            <>
              <DialogTitle className="text-base">Connect a provider</DialogTitle>
              <DialogDescription className="text-xs">
                Choose an email provider to connect with your own credentials. CourierX never stores or sends through its own infrastructure.
              </DialogDescription>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <ProviderIcon provider={selected!} size={22} chip />
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base truncate">Connect {providerMeta?.name}</DialogTitle>
                <DialogDescription className="text-xs truncate">
                  {providerMeta?.description}
                </DialogDescription>
              </div>
              <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground font-medium px-2 py-1 rounded-full border border-border/60 bg-muted/40">
                Step 2 of 2
              </span>
            </div>
          )}
        </DialogHeader>

        {step === "select" ? (
          <div className="px-5 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelect(p.id)}
                  className={cn(
                    "group flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-left transition-all",
                    "hover:bg-muted/40 hover:border-primary/40 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30",
                  )}
                >
                  <ProviderIcon provider={p.id} size={20} chip />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-medium leading-tight">{p.name}</span>
                    <span className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{p.description}</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/20 p-2.5">
              <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                All credentials are encrypted at rest with AES-256 and verified server-side. We will test the connection before saving.
              </p>
            </div>
          </div>
        ) : (
          <div className="px-5 py-4 space-y-4">
            {/* Setup guide */}
            {guide && (
              <details className="group rounded-lg border border-border/60 bg-muted/20 overflow-hidden" open>
                <summary className="flex items-center justify-between gap-2 px-3 py-2 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground">How to get your credentials</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground group-open:hidden">Show</span>
                  <span className="text-[10px] text-muted-foreground hidden group-open:inline">Hide</span>
                </summary>
                <div className="px-3 pb-3 pt-1 space-y-2 border-t border-border/40">
                  <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside leading-relaxed">
                    {guide.steps.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ol>
                  {guide.docsUrl && (
                    <a
                      href={guide.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View documentation
                    </a>
                  )}
                </div>
              </details>
            )}

            {/* Subdomain guidance */}
            {guide && guide.subdomainExample && (
              <div className="flex items-start gap-2 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] p-2.5 dark:bg-amber-950/40 dark:border-amber-800">
                <Lightbulb className="h-3.5 w-3.5 text-[#B45309] dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-[11px] font-medium text-[#92400E] dark:text-amber-300">Use a subdomain</p>
                  <p className="text-[11px] text-[#92400E]/80 dark:text-amber-300/80 leading-relaxed">
                    Verify <span className="font-mono">{guide.subdomainExample}</span> instead of your root domain to avoid DKIM conflicts when using multiple providers.
                  </p>
                </div>
              </div>
            )}

            {/* Credential form */}
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  <Label htmlFor="api_key">
                    {selected === "postmark" ? "Server Token" : "API Key"} *
                  </Label>
                  <Input
                    id="api_key"
                    type="password"
                    placeholder={selected === "postmark" ? "Server token" : selected === "resend" ? "re_..." : "SG.xxx"}
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
                    <p className="text-[10px] text-muted-foreground">The domain you verified in Mailgun (use a subdomain).</p>
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

              {/* Verification result inline */}
              {verifyResult && !verifyResult.verified && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2.5">
                  <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <div className="text-xs text-destructive">
                    <p className="font-medium">Verification failed</p>
                    <p className="mt-0.5 text-destructive/80">{verifyResult.error}</p>
                  </div>
                </div>
              )}

              {verifyResult?.verified && (
                <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/5 p-2.5">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  <p className="text-xs text-success font-medium">Credentials verified</p>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2.5">
                  <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-xs text-destructive">{error}</p>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60 -mx-5 px-5 -mb-4 pb-4 mt-1 bg-muted/20">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => { setStep("select"); setVerifyResult(null) }}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleClose(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={mutation.isPending} className="gap-1.5">
                    {mutation.isPending ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Verifying…</>
                    ) : (
                      <><ShieldCheck className="h-3.5 w-3.5" /> Connect & verify</>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
