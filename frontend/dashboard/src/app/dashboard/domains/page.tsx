"use client"

import { useEffect, useState } from "react"
import { Plus, Trash2, RefreshCw, ExternalLink } from "lucide-react"
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
import { cn } from "@/lib/utils"
import { domainsService, type Domain } from "@/services/domains.service"
import { toast } from "sonner"

export default function DomainsPage() {
  const [domains, setDomains]           = useState<Domain[]>([])
  const [loading, setLoading]           = useState(true)
  const [addOpen, setAddOpen]           = useState(false)
  const [dnsOpen, setDnsOpen]           = useState(false)
  const [selected, setSelected]         = useState<Domain | null>(null)
  const [domainInput, setDomainInput]   = useState("")
  const [adding, setAdding]             = useState(false)
  const [addError, setAddError]         = useState("")
  const [verifying, setVerifying]       = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting]         = useState(false)

  useEffect(() => {
    domainsService.list()
      .then(setDomains)
      .catch(() => toast.error("Failed to load domains"))
      .finally(() => setLoading(false))
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    setAddError("")
    try {
      const created = await domainsService.create(domainInput.trim())
      setDomains((prev) => [created, ...prev])
      setAddOpen(false)
      setDomainInput("")
      toast.success("Domain added", { description: `Add the DNS records to verify ${domainInput.trim()}.` })
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { errors?: string[] } } }
      setAddError(apiErr.response?.data?.errors?.[0] ?? "Failed to add domain.")
    } finally {
      setAdding(false)
    }
  }

  async function handleVerify(id: string, domain: string) {
    setVerifying(id)
    try {
      const updated = await domainsService.verify(id)
      setDomains((prev) => prev.map((d) => d.id === id ? updated : d))
      if (updated.verified_at) {
        toast.success("Domain verified", { description: domain })
      } else {
        toast.error("Verification failed", { description: "DNS records not found yet. Try again in a few minutes." })
      }
    } catch {
      toast.error("Verification check failed")
    } finally {
      setVerifying(null)
    }
  }

  async function handleDelete(id: string, domain: string) {
    setDeleting(true)
    try {
      await domainsService.delete(id)
      setDomains((prev) => prev.filter((d) => d.id !== id))
      toast.success("Domain removed", { description: domain })
    } catch {
      toast.error("Failed to remove domain")
    } finally {
      setDeleting(false)
      setConfirmDeleteId(null)
    }
  }

  function openDnsRecords(domain: Domain) {
    setSelected(domain)
    setDnsOpen(true)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Domains</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Manage sending and tracking domains
          </p>
        </div>
        <Button size="sm" className="h-8 gap-1.5" onClick={() => setAddOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Add domain
        </Button>
      </div>

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
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground animate-pulse">
                  Loading…
                </td>
              </tr>
            ) : domains.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center">
                  <p className="text-sm text-muted-foreground">No domains added yet.</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Add a domain to start sending authenticated email.</p>
                </td>
              </tr>
            ) : (
              domains.map((d, i) => (
                <tr
                  key={d.id}
                  className={cn(
                    "hover:bg-muted/20 transition-colors",
                    i < domains.length - 1 && "border-b border-border/50",
                  )}
                >
                  <td className="px-4 py-3 font-mono text-sm">{d.domain}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <DotIndicator status={d.verified_at ? "active" : "inactive"} />
                      <span className="text-xs">{d.verified_at ? "Verified" : "Unverified"}</span>
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
                          disabled={deleting}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => handleDelete(d.id, d.domain)}
                          disabled={deleting}
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
                            disabled={verifying === d.id}
                            onClick={() => handleVerify(d.id, d.domain)}
                          >
                            <RefreshCw className={cn("h-3 w-3", verifying === d.id && "animate-spin")} />
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
              <Button type="submit" size="sm" disabled={adding}>
                {adding ? "Adding…" : "Add domain"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* DNS records modal */}
      <Dialog open={dnsOpen} onOpenChange={setDnsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>DNS records — {selected?.domain}</DialogTitle>
            <DialogDescription>
              Add these records to your DNS provider, then click Verify.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 mt-2">
              {selected.verification_token && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium">Verification (TXT)</p>
                  <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1">
                    <div className="flex gap-2 text-[11px] font-mono">
                      <span className="text-muted-foreground w-14 shrink-0">Host</span>
                      <span className="break-all">_courierx-verification.{selected.domain}</span>
                    </div>
                    <div className="flex gap-2 text-[11px] font-mono">
                      <span className="text-muted-foreground w-14 shrink-0">Value</span>
                      <span className="break-all">courierx-verify={selected.verification_token}</span>
                    </div>
                  </div>
                </div>
              )}

              {selected.spf_record && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium">SPF (TXT)</p>
                  <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1">
                    <div className="flex gap-2 text-[11px] font-mono">
                      <span className="text-muted-foreground w-14 shrink-0">Host</span>
                      <span className="break-all">{selected.domain}</span>
                    </div>
                    <div className="flex gap-2 text-[11px] font-mono">
                      <span className="text-muted-foreground w-14 shrink-0">Value</span>
                      <span className="break-all">{selected.spf_record}</span>
                    </div>
                  </div>
                </div>
              )}

              {selected.dkim_selector && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium">DKIM (CNAME)</p>
                  <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1">
                    <div className="flex gap-2 text-[11px] font-mono">
                      <span className="text-muted-foreground w-14 shrink-0">Host</span>
                      <span className="break-all">{selected.dkim_selector}._domainkey.{selected.domain}</span>
                    </div>
                    <div className="flex gap-2 text-[11px] font-mono">
                      <span className="text-muted-foreground w-14 shrink-0">Points to</span>
                      <span className="break-all">{selected.dkim_selector}.dkim.courierx.com</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button size="sm" onClick={() => setDnsOpen(false)}>Done</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
