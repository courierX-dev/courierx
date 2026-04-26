"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Trash2, RefreshCw, ExternalLink, Copy, Check } from "lucide-react"
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
import { DotIndicator } from "@/components/ui/dot-indicator"
import { ProviderIcon } from "@/components/ui/provider-icon"
import { PageShell } from "@/components/dashboard/page-shell"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionError } from "@/components/dashboard/inline-error"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  useDomains,
  useCreateDomain,
  useVerifyDomain,
  useDeleteDomain,
  useRecheckDomain,
} from "@/hooks/use-domains"
import type {
  Domain,
  DnsRecord,
  DomainProviderVerification,
} from "@/services/domains.service"

function titleCase(s: string) {
  return s
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ")
}

function formatVerifiedDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
  } catch {
    return iso
  }
}

function formatRelative(iso: string) {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return iso
  const diffMs = then - Date.now()
  const diffSec = Math.round(diffMs / 1000)
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" })

  const abs = Math.abs(diffSec)
  if (abs < 60) return rtf.format(diffSec, "second")
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute")
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour")
  return rtf.format(Math.round(diffSec / 86400), "day")
}

function providerStatusMeta(status: string): { dot: "active" | "pending" | "failed"; label: string } {
  if (status === "verified") return { dot: "active", label: "Verified" }
  if (status === "failed") return { dot: "failed", label: "Failed" }
  return { dot: "pending", label: "Pending" }
}

function providerTimestamp(p: DomainProviderVerification): string {
  if (p.status === "verified" && p.verified_at) {
    return `verified ${formatVerifiedDate(p.verified_at)}`
  }
  if (p.last_checked_at) {
    return `last checked ${formatRelative(p.last_checked_at)}`
  }
  return "not yet checked"
}

function DnsRecordCard({ record }: { record: DnsRecord }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(record.value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Couldn't copy value")
    }
  }

  return (
    <div
      className={cn(
        "rounded-md border p-3 space-y-1",
        record.verified
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-border bg-muted/30",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex gap-2 text-[11px] font-mono">
          <span className="text-muted-foreground w-14 shrink-0">Type</span>
          <span className="break-all">{record.type}</span>
        </div>
        {record.verified && (
          <span
            className="flex items-center gap-1 text-[10px] font-medium text-emerald-500"
            aria-label="Detected"
          >
            <Check className="h-3 w-3" />
            Detected
          </span>
        )}
      </div>
      <div className="flex gap-2 text-[11px] font-mono">
        <span className="text-muted-foreground w-14 shrink-0">Host</span>
        <span className="break-all">{record.name}</span>
      </div>
      <div className="flex gap-2 text-[11px] font-mono">
        <span className="text-muted-foreground w-14 shrink-0">Value</span>
        <span className="break-all flex-1">{record.value}</span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy DNS record value"
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
      {record.ttl != null && (
        <div className="flex gap-2 text-[11px] font-mono">
          <span className="text-muted-foreground w-14 shrink-0">TTL</span>
          <span className="break-all">{record.ttl}</span>
        </div>
      )}
    </div>
  )
}

export default function DomainsPage() {
  const { data: domains, isLoading, isError, refetch } = useDomains()
  const createMutation = useCreateDomain()
  const verifyMutation = useVerifyDomain()
  const deleteMutation = useDeleteDomain()
  const recheckMutation = useRecheckDomain()

  const [addOpen, setAddOpen]           = useState(false)
  const [dnsOpen, setDnsOpen]           = useState(false)
  const [selected, setSelected]         = useState<Domain | null>(null)
  const [domainInput, setDomainInput]   = useState("")
  const [addError, setAddError]         = useState("")
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [verifyingId, setVerifyingId]   = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddError("")
    try {
      await createMutation.mutateAsync(domainInput.trim())
      setAddOpen(false)
      setDomainInput("")
      toast.success("Domain added", { description: `Add the DNS records to verify ${domainInput.trim()}.` })
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { errors?: string[] } } }
      setAddError(apiErr.response?.data?.errors?.[0] ?? "Failed to add domain.")
    }
  }

  async function handleVerify(id: string, domain: string) {
    setVerifyingId(id)
    try {
      await verifyMutation.mutateAsync(id)
      toast.success("Checking DNS", { description: `We'll keep polling ${domain} in the background.` })
    } catch {
      toast.error("Could not start verification")
    } finally {
      setVerifyingId(null)
    }
  }

  async function handleDelete(id: string, domain: string) {
    try {
      await deleteMutation.mutateAsync(id)
      toast.success("Domain removed", { description: domain })
    } catch {
      toast.error("Failed to remove domain")
    } finally {
      setConfirmDeleteId(null)
    }
  }

  function openDnsRecords(domain: Domain) {
    setSelected(domain)
    setDnsOpen(true)
  }

  async function handleRecheck(id: string) {
    try {
      await recheckMutation.mutateAsync(id)
      toast.success("Checking providers", {
        description: "Polling each provider for the latest DKIM and SPF status.",
      })
    } catch {
      toast.error("Couldn't start re-check")
    }
  }

  // Error state
  if (isError) {
    return (
      <PageShell>
        <PageHeader title="Domains" subtitle="Manage sending and tracking domains" />
        <SectionError message="Failed to load domains" onRetry={refetch} />
      </PageShell>
    )
  }

  const domainsList = domains ?? []

  return (
    <PageShell>
      <PageHeader title="Domains" subtitle="Manage sending and tracking domains">
        <Button size="sm" className="h-8 gap-1.5" onClick={() => setAddOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Add domain
        </Button>
      </PageHeader>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Domain</th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Status</th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">Added</th>
              <th className="px-4 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-4 py-6" aria-busy="true">
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-10 rounded bg-muted animate-pulse" />
                    ))}
                  </div>
                </td>
              </tr>
            ) : domainsList.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center">
                  <p className="text-sm text-muted-foreground">No domains added yet.</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Add a domain to start sending authenticated email.</p>
                </td>
              </tr>
            ) : (
              domainsList.map((d, i) => (
                <tr
                  key={d.id}
                  className={cn(
                    "hover:bg-muted/20 transition-colors",
                    i < domainsList.length - 1 && "border-b border-border/50",
                    d.status === "failed" && "opacity-55",
                  )}
                >
                  <td className="px-4 py-3 font-mono text-sm">{d.domain}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <DotIndicator
                        status={
                          d.status === "verified"
                            ? "active"
                            : d.status === "failed"
                              ? "inactive"
                              : "pending"
                        }
                      />
                      <span className="text-xs">
                        {d.status === "verified"
                          ? "Verified"
                          : d.status === "failed"
                            ? "Failed"
                            : d.status === "pending_verification"
                              ? "Checking…"
                              : "Pending"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground hidden md:table-cell">
                    {new Date(d.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {confirmDeleteId === d.id ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-xs text-muted-foreground">Remove domain?</span>
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
                          onClick={() => handleDelete(d.id, d.domain)}
                          disabled={deleteMutation.isPending}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-muted-foreground gap-1"
                          onClick={() => openDnsRecords(d)}
                        >
                          <ExternalLink className="h-3 w-3" />
                          DNS records
                        </Button>
                        {!d.verified_at && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-muted-foreground gap-1"
                            disabled={verifyingId === d.id}
                            onClick={() => handleVerify(d.id, d.domain)}
                          >
                            <RefreshCw className={cn("h-3 w-3", verifyingId === d.id && "animate-spin")} />
                            Verify
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => setConfirmDeleteId(d.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Info callout */}
      <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Authentication setup</p>
        <p>
          Add the DNS records below to your domain registrar to verify your sending domains.
          DKIM and SPF are required; DMARC is strongly recommended to improve deliverability.
        </p>
      </div>

      {/* Add domain dialog */}
      <Dialog open={addOpen} onOpenChange={(v) => { setAddOpen(v); if (!v) { setDomainInput(""); setAddError("") } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add domain</DialogTitle>
            <DialogDescription>
              Enter the domain you want to use for sending email.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="domain-input">Domain</Label>
              <Input
                id="domain-input"
                placeholder="mail.example.com"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                required
              />
            </div>
            {addError && (
              <p className="text-xs text-destructive">{addError}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => { setAddOpen(false); setDomainInput(""); setAddError("") }}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Adding…" : "Add domain"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* DNS records modal */}
      <Dialog open={dnsOpen} onOpenChange={setDnsOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>DNS records — {selected?.domain}</DialogTitle>
            <DialogDescription>
              Add these records at your DNS provider. We&apos;ll detect them across every connected provider automatically.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-6 mt-2">
              {/* DNS records section */}
              <section className="space-y-2">
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  DNS records to add
                </h3>
                {selected.dns_records.length === 0 ? (
                  <div className="rounded-md border border-border/60 bg-muted/20 px-4 py-6 text-center space-y-3">
                    <p className="text-sm text-muted-foreground">
                      No DNS records yet — connect a provider first.
                    </p>
                    <Button asChild size="sm" variant="outline">
                      <Link href="/dashboard/providers">Connect a provider</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selected.dns_records.map((record, i) => (
                      <DnsRecordCard
                        key={`${record.type}-${record.name}-${i}`}
                        record={record}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* Provider verifications section */}
              <section className="space-y-2">
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Provider verifications
                </h3>
                {selected.providers.length === 0 ? (
                  <div className="rounded-md border border-border/60 bg-muted/20 px-4 py-6 text-center space-y-3">
                    <p className="text-sm text-muted-foreground">
                      No providers connected yet — connect one to enable sending from this domain.
                    </p>
                    <Button asChild size="sm" variant="outline">
                      <Link href="/dashboard/providers">Connect a provider</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-md border border-border divide-y divide-border/60">
                    {selected.providers.map((p) => {
                      const meta = providerStatusMeta(p.status)
                      const showError = p.status === "failed" && p.error
                      return (
                        <div
                          key={p.provider_connection_id}
                          className="px-3 py-2.5"
                        >
                          <div className="flex items-center gap-2.5">
                            <ProviderIcon provider={p.provider} size={16} chip />
                            {p.priority != null && (
                              <span
                                className="shrink-0 rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                                aria-label={`Priority ${p.priority}`}
                                title={`Routing priority ${p.priority}`}
                              >
                                #{p.priority}
                              </span>
                            )}
                            <span
                              className={cn(
                                "text-sm flex-1 truncate",
                                p.display_name ? "font-sans" : "font-mono",
                              )}
                            >
                              {p.display_name ?? titleCase(p.provider)}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <DotIndicator status={meta.dot} />
                              <span className="text-xs">{meta.label}</span>
                            </div>
                            <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
                              {providerTimestamp(p)}
                            </span>
                          </div>
                          {showError && (
                            <p className="mt-1 ml-[26px] text-xs text-destructive break-words">
                              {p.error}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>

              {/* Footer */}
              <div className="flex justify-between items-center pt-2 border-t border-border/60">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRecheck(selected.id)}
                  disabled={recheckMutation.isPending}
                  aria-label="Re-check provider verifications"
                  className="gap-1.5"
                >
                  <RefreshCw
                    className={cn("h-3.5 w-3.5", recheckMutation.isPending && "animate-spin")}
                  />
                  {recheckMutation.isPending ? "Re-checking…" : "Re-check now"}
                </Button>
                <Button size="sm" onClick={() => setDnsOpen(false)}>
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
