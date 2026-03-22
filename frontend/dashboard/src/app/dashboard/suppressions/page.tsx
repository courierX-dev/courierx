"use client"

import { useState, useMemo } from "react"
import { Search, Upload, Download, Trash2, Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { PageShell } from "@/components/dashboard/page-shell"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionError } from "@/components/dashboard/inline-error"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useSuppressions, useCreateSuppression, useDeleteSuppression } from "@/hooks/use-suppressions"

const REASON_COLOR: Record<string, string> = {
  hard_bounce: "text-destructive",
  complaint:   "text-destructive",
  unsubscribe: "text-warning",
  manual:      "text-muted-foreground",
}

const REASONS = ["hard_bounce", "soft_bounce", "complaint", "unsubscribe", "manual"]

export default function SuppressionsPage() {
  const { data: suppressions, isLoading, isError, refetch } = useSuppressions()
  const createMutation = useCreateSuppression()
  const deleteMutation = useDeleteSuppression()

  const [search, setSearch]      = useState("")
  const [open, setOpen]          = useState(false)
  const [email, setEmail]        = useState("")
  const [reason, setReason]      = useState("manual")
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!suppressions) return []
    if (!search) return suppressions
    const q = search.toLowerCase()
    return suppressions.filter((s) =>
      s.email.toLowerCase().includes(q) ||
      s.reason.toLowerCase().includes(q),
    )
  }, [suppressions, search])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    try {
      await createMutation.mutateAsync({ email, reason })
      setOpen(false)
      setEmail("")
      setReason("manual")
      toast.success("Suppression added", { description: email })
    } catch {
      toast.error("Failed to add suppression")
    }
  }

  async function handleDelete(id: string, emailAddr: string) {
    try {
      await deleteMutation.mutateAsync(id)
      toast.success("Suppression removed", { description: emailAddr })
    } catch {
      toast.error("Failed to remove suppression")
    } finally {
      setConfirmId(null)
    }
  }

  // Error state
  if (isError) {
    return (
      <PageShell>
        <PageHeader title="Suppressions" subtitle="Emails that will not receive future messages" />
        <SectionError message="Failed to load suppressions" onRetry={refetch} />
      </PageShell>
    )
  }

  return (
    <PageShell>
      <PageHeader title="Suppressions" subtitle="Emails that will not receive future messages">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1.5" disabled title="Coming soon">
            <Upload className="h-3.5 w-3.5" />
            Import
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5" disabled title="Coming soon">
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
          <Button size="sm" className="h-8 gap-1.5" onClick={() => setOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      </PageHeader>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-8 h-8 text-sm w-72"
            placeholder="Search by email or reason…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="ml-auto text-xs text-muted-foreground font-mono">
          {filtered.length} address{filtered.length !== 1 ? "es" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Email</th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Reason</th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">Suppressed at</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-4 py-6" aria-busy="true">
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-8 rounded bg-muted animate-pulse" />
                    ))}
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    {search ? "No results match your search." : "No suppressions yet."}
                  </p>
                  {!search && (
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Bounced and unsubscribed emails will appear here automatically.
                    </p>
                  )}
                </td>
              </tr>
            ) : (
              filtered.map((s, i) => (
                <tr
                  key={s.id}
                  className={cn(
                    "hover:bg-muted/20 transition-colors",
                    i < filtered.length - 1 && "border-b border-border/50",
                  )}
                >
                  <td className="px-4 py-2.5 font-mono text-xs">{s.email}</td>
                  <td className="px-4 py-2.5">
                    <span className={cn("text-xs font-mono", REASON_COLOR[s.reason] ?? "text-muted-foreground")}>
                      {s.reason}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground hidden md:table-cell">
                    {new Date(s.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {confirmId === s.id ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-xs text-muted-foreground">Remove?</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => setConfirmId(null)}
                          disabled={deleteMutation.isPending}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => handleDelete(s.id, s.email)}
                          disabled={deleteMutation.isPending}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => setConfirmId(s.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add suppression</DialogTitle>
            <DialogDescription>
              This email address will be blocked from receiving future messages.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="sup-email">Email address</Label>
              <Input
                id="sup-email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sup-reason">Reason</Label>
              <select
                id="sup-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {REASONS.map((r) => (
                  <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Adding…" : "Add suppression"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
