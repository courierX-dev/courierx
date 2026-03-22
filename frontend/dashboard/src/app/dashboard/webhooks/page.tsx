"use client"

import { useState } from "react"
import { Plus, Trash2, Pencil } from "lucide-react"
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
import { WEBHOOK_EVENTS, type WebhookEndpoint } from "@/services/webhooks.service"
import { toast } from "sonner"
import { useWebhooks, useCreateWebhook, useUpdateWebhook, useDeleteWebhook } from "@/hooks/use-webhooks"

function WebhookForm({
  initial,
  onSave,
  onCancel,
  isPending,
}: {
  initial?: Partial<WebhookEndpoint>
  onSave: (data: { url: string; description: string; events: string[] }) => Promise<void>
  onCancel: () => void
  isPending?: boolean
}) {
  const [url, setUrl]          = useState(initial?.url ?? "")
  const [description, setDesc] = useState(initial?.description ?? "")
  const [events, setEvents]    = useState<string[]>(initial?.events ?? [])
  const [saving, setSaving]    = useState(false)
  const [error, setError]      = useState("")

  function toggleEvent(ev: string) {
    setEvents((prev) =>
      prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (events.length === 0) { setError("Select at least one event."); return }
    setSaving(true)
    setError("")
    try {
      await onSave({ url, description, events })
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { errors?: string[] } } }
      setError(apiErr.response?.data?.errors?.[0] ?? "Failed to save webhook.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
      <div className="space-y-1.5">
        <Label htmlFor="wh-url">Endpoint URL</Label>
        <Input
          id="wh-url"
          type="url"
          placeholder="https://example.com/webhooks/courierx"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="wh-desc">Description <span className="text-muted-foreground">(optional)</span></Label>
        <Input
          id="wh-desc"
          placeholder="Production delivery events"
          value={description}
          onChange={(e) => setDesc(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Events to send</Label>
        <div className="grid grid-cols-2 gap-1.5">
          {WEBHOOK_EVENTS.map((ev) => (
            <label
              key={ev}
              className="flex items-center gap-2 rounded-md border border-border px-2.5 py-2 cursor-pointer hover:bg-muted/20 transition-colors"
            >
              <input
                type="checkbox"
                checked={events.includes(ev)}
                onChange={() => toggleEvent(ev)}
                className="h-3.5 w-3.5 accent-primary"
              />
              <span className="text-[11px] font-mono">{ev}</span>
            </label>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={saving || isPending}>
          {saving ? "Saving…" : "Save webhook"}
        </Button>
      </div>
    </form>
  )
}

export default function WebhooksPage() {
  const { data: webhooks, isLoading, isError, refetch } = useWebhooks()
  const createMutation = useCreateWebhook()
  const updateMutation = useUpdateWebhook()
  const deleteMutation = useDeleteWebhook()

  const [addOpen, setAddOpen]             = useState(false)
  const [editTarget, setEditTarget]       = useState<WebhookEndpoint | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  async function handleCreate(data: { url: string; description: string; events: string[] }) {
    await createMutation.mutateAsync(data)
    setAddOpen(false)
    toast.success("Webhook added")
  }

  async function handleUpdate(data: { url: string; description: string; events: string[] }) {
    if (!editTarget) return
    await updateMutation.mutateAsync({ id: editTarget.id, ...data })
    setEditTarget(null)
    toast.success("Webhook updated")
  }

  async function handleToggle(w: WebhookEndpoint) {
    try {
      await updateMutation.mutateAsync({ id: w.id, is_active: !w.is_active })
      toast.success(w.is_active ? "Webhook disabled" : "Webhook enabled")
    } catch {
      toast.error("Failed to update webhook")
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMutation.mutateAsync(id)
      toast.success("Webhook deleted")
    } catch {
      toast.error("Failed to delete webhook")
    } finally {
      setConfirmDeleteId(null)
    }
  }

  // Error state
  if (isError) {
    return (
      <PageShell>
        <PageHeader title="Webhooks" subtitle="Receive real-time delivery events via HTTP POST" />
        <SectionError message="Failed to load webhooks" onRetry={refetch} />
      </PageShell>
    )
  }

  const webhooksList = webhooks ?? []

  return (
    <PageShell>
      <PageHeader title="Webhooks" subtitle="Receive real-time delivery events via HTTP POST">
        <Button size="sm" className="h-8 gap-1.5" onClick={() => setAddOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Add webhook
        </Button>
      </PageHeader>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">URL</th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">Events</th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Status</th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">Added</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6" aria-busy="true">
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-10 rounded bg-muted animate-pulse" />
                    ))}
                  </div>
                </td>
              </tr>
            ) : webhooksList.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center">
                  <p className="text-sm text-muted-foreground">No webhooks configured.</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Add an endpoint to receive delivery event notifications.</p>
                </td>
              </tr>
            ) : (
              webhooksList.map((w, i) => (
                <tr
                  key={w.id}
                  className={cn(
                    "hover:bg-muted/20 transition-colors",
                    i < webhooksList.length - 1 && "border-b border-border/50",
                  )}
                >
                  <td className="px-4 py-2.5">
                    <p className="font-mono text-xs text-muted-foreground max-w-50 truncate">{w.url}</p>
                    {w.description && (
                      <p className="text-[11px] text-muted-foreground/60 mt-0.5">{w.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell">
                    <div className="flex gap-1 flex-wrap">
                      {w.events.map((ev) => (
                        <span
                          key={ev}
                          className="inline-flex items-center rounded border border-border px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground"
                        >
                          {ev}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => handleToggle(w)}
                      className="flex items-center gap-2 hover:opacity-70 transition-opacity"
                      title={w.is_active ? "Click to disable" : "Click to enable"}
                    >
                      <DotIndicator status={w.is_active ? "active" : "inactive"} />
                      <span className="text-xs">{w.is_active ? "Active" : "Inactive"}</span>
                    </button>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground hidden md:table-cell">
                    {new Date(w.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {confirmDeleteId === w.id ? (
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
                          onClick={() => handleDelete(w.id)}
                          disabled={deleteMutation.isPending}
                        >
                          Delete
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground"
                          onClick={() => setEditTarget(w)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => setConfirmDeleteId(w.id)}
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

      {/* Payload note */}
      <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
        <p className="text-xs font-medium mb-2">Example payload</p>
        <pre className="font-mono text-[11px] text-muted-foreground leading-relaxed overflow-x-auto">
{`{
  "event":      "delivered",
  "message_id": "msg_01j...",
  "to":         "user@example.com",
  "provider":   "SES",
  "timestamp":  "2025-02-23T14:32:01Z",
  "latency_ms": 142
}`}
        </pre>
      </div>

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add webhook</DialogTitle>
            <DialogDescription>
              Configure an endpoint to receive delivery event notifications.
            </DialogDescription>
          </DialogHeader>
          <WebhookForm
            onSave={handleCreate}
            onCancel={() => setAddOpen(false)}
            isPending={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(v) => { if (!v) setEditTarget(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit webhook</DialogTitle>
            <DialogDescription>
              Update the endpoint URL, description, or subscribed events.
            </DialogDescription>
          </DialogHeader>
          {editTarget && (
            <WebhookForm
              initial={editTarget}
              onSave={handleUpdate}
              onCancel={() => setEditTarget(null)}
              isPending={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
