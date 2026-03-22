"use client"

import { useState } from "react"
import { Plus, Copy, Trash2, Check, AlertTriangle } from "lucide-react"
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
import { PageShell } from "@/components/dashboard/page-shell"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionError } from "@/components/dashboard/inline-error"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useApiKeys, useCreateApiKey, useRevokeApiKey, useDeleteApiKey } from "@/hooks/use-api-keys"
import type { ApiKey, CreatedApiKey } from "@/services/api-keys.service"

type CreateStep = "form" | "created"

export default function ApiKeysPage() {
  const { data: keys, isLoading, isError, refetch } = useApiKeys()
  const createMutation = useCreateApiKey()
  const revokeMutation = useRevokeApiKey()
  const deleteMutation = useDeleteApiKey()

  const [createOpen, setCreateOpen] = useState(false)
  const [createStep, setCreateStep] = useState<CreateStep>("form")
  const [keyName, setKeyName]       = useState("")
  const [created, setCreated]       = useState<CreatedApiKey | null>(null)
  const [copied, setCopied]         = useState(false)

  // Revoke confirmation dialog
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null)

  // Inline delete confirm (for revoked keys)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    try {
      const newKey = await createMutation.mutateAsync({ name: keyName })
      setCreated(newKey)
      setCreateStep("created")
    } catch {
      toast.error("Failed to create key")
    }
  }

  function handleCreateClose() {
    setCreateOpen(false)
    setTimeout(() => { setCreateStep("form"); setKeyName(""); setCopied(false); setCreated(null) }, 300)
  }

  function handleCopy() {
    if (!created?.raw_key) return
    navigator.clipboard.writeText(created.raw_key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleRevoke() {
    if (!revokeTarget) return
    try {
      await revokeMutation.mutateAsync(revokeTarget.id)
      toast.success("Key revoked", { description: `"${revokeTarget.name}" is now inactive.` })
      setRevokeTarget(null)
    } catch {
      toast.error("Failed to revoke key")
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMutation.mutateAsync(id)
      toast.success("Key deleted")
    } catch {
      toast.error("Failed to delete key")
    } finally {
      setConfirmDeleteId(null)
    }
  }

  // Error state
  if (isError) {
    return (
      <PageShell>
        <PageHeader title="API Keys" subtitle="Authenticate requests to the CourierX API" />
        <SectionError message="Failed to load API keys" onRetry={refetch} />
      </PageShell>
    )
  }

  const keysList = keys ?? []

  return (
    <PageShell>
      <PageHeader title="API Keys" subtitle="Authenticate requests to the CourierX API">
        <Button size="sm" className="h-8 gap-1.5" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Create key
        </Button>
      </PageHeader>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Name</th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Key</th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">Scopes</th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Created</th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Last used</th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-6" aria-busy="true">
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-10 rounded bg-muted animate-pulse" />
                    ))}
                  </div>
                </td>
              </tr>
            ) : keysList.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center">
                  <p className="text-sm text-muted-foreground">No API keys yet.</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Create a key to start making API requests.</p>
                </td>
              </tr>
            ) : (
              keysList.map((k, i) => (
                <tr
                  key={k.id}
                  className={cn(
                    "transition-colors",
                    k.status === "revoked" ? "opacity-50" : "hover:bg-muted/20",
                    i < keysList.length - 1 && "border-b border-border/50",
                  )}
                >
                  <td className="px-4 py-2.5 text-sm font-medium">{k.name}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                    {k.key_prefix}···
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell">
                    <div className="flex gap-1 flex-wrap">
                      {k.scopes.map((s) => (
                        <span
                          key={s}
                          className="inline-flex items-center rounded border border-border px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground hidden lg:table-cell">
                    {new Date(k.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground hidden lg:table-cell">
                    {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : "Never"}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <DotIndicator status={k.status} />
                      <span className="text-xs capitalize">{k.status}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {k.status === "active" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive gap-1"
                        onClick={() => setRevokeTarget(k)}
                      >
                        Revoke
                      </Button>
                    )}
                    {k.status === "revoked" && (
                      confirmDeleteId === k.id ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-xs text-muted-foreground">Delete?</span>
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
                            onClick={() => handleDelete(k.id)}
                            disabled={deleteMutation.isPending}
                          >
                            Delete
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => setConfirmDeleteId(k.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create key dialog */}
      <Dialog open={createOpen} onOpenChange={(v) => { if (!v) handleCreateClose() }}>
        <DialogContent className="sm:max-w-md">
          {createStep === "form" ? (
            <>
              <DialogHeader>
                <DialogTitle>Create API key</DialogTitle>
                <DialogDescription>
                  Give your key a descriptive name so you can identify it later.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="key-name">Key name</Label>
                  <Input
                    id="key-name"
                    placeholder="e.g. Production server"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={handleCreateClose}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating…" : "Create key"}
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Save your API key</DialogTitle>
                <DialogDescription>
                  This is the only time the full key will be shown. Copy it now.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-2 space-y-4">
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2.5">
                  <code className="flex-1 font-mono text-xs text-foreground break-all select-all">
                    {created?.raw_key}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 shrink-0"
                    onClick={handleCopy}
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-warning" />
                  Store this securely — it won&apos;t be shown again.
                </p>
                <div className="flex justify-end">
                  <Button size="sm" onClick={handleCreateClose}>Done</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Revoke confirmation dialog */}
      <Dialog open={!!revokeTarget} onOpenChange={(v) => { if (!v) setRevokeTarget(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Revoke API key
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="rounded-md border border-destructive/20 bg-destructive/4 px-4 py-3 space-y-1">
              <p className="text-sm font-medium">{revokeTarget?.name}</p>
              <p className="font-mono text-xs text-muted-foreground">{revokeTarget?.key_prefix}···</p>
            </div>
            <p className="text-sm text-muted-foreground">
              All requests using this key will fail immediately. You will need to issue a new key for any services relying on it.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRevokeTarget(null)}
                disabled={revokeMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRevoke}
                disabled={revokeMutation.isPending}
              >
                {revokeMutation.isPending ? "Revoking…" : "Revoke key"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
