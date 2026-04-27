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
import { authService } from "@/services/auth.service"
import api from "@/services/api"
import { toast } from "sonner"
import { useCurrentTenant } from "@/hooks/use-auth"
import { PageShell } from "@/components/dashboard/page-shell"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionError } from "@/components/dashboard/inline-error"
import type { Tenant } from "@/types/auth"

const NOTIFICATIONS = [
  { id: "failover_events",   label: "Failover events",   desc: "Notify when a provider failover occurs" },
  { id: "usage_alerts",      label: "Usage alerts",      desc: "Notify when usage exceeds 80% of plan limit" },
  { id: "bounce_rate_spike", label: "Bounce rate spike", desc: "Notify when bounce rate exceeds 5%" },
  { id: "weekly_summary",    label: "Weekly summary",    desc: "Weekly email summary of delivery performance" },
]

export default function SettingsPage() {
  const { data: tenant, isLoading, isError, refetch } = useCurrentTenant()
  const [deleteOpen, setDeleteOpen]       = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState("")
  const [isDeleting, setIsDeleting]       = useState(false)
  const [notifications, setNotifications] = useState<Record<string, boolean>>({})
  const [tracking, setTracking]           = useState<{ opens: boolean; clicks: boolean }>({ opens: true, clicks: true })
  const [settingsInit, setSettingsInit]   = useState(false)

  // Initialize stateful settings from tenant data once loaded.
  // Tracking defaults to ON — tenants opt out, not in. We treat anything
  // other than an explicit `false` as enabled so a missing key reads as on.
  if (tenant && !settingsInit) {
    const settings = (tenant.settings || {}) as Record<string, unknown>
    const notifs   = (settings.notifications || {}) as Record<string, boolean>
    const track    = (settings.tracking || {}) as Record<string, unknown>
    setNotifications(notifs)
    setTracking({
      opens:  track.opens  !== false,
      clicks: track.clicks !== false,
    })
    setSettingsInit(true)
  }

  async function toggleNotification(id: string, checked: boolean) {
    const prev = { ...notifications }
    const updated = { ...notifications, [id]: checked }
    setNotifications(updated)

    try {
      await api.patch<{ tenant: Tenant }>("/api/v1/auth/me", {
        settings: { notifications: updated }
      })
      toast.success("Notification preferences updated")
    } catch {
      toast.error("Failed to update preferences")
      setNotifications(prev)
    }
  }

  async function toggleTracking(key: "opens" | "clicks", checked: boolean) {
    const prev = { ...tracking }
    const updated = { ...tracking, [key]: checked }
    setTracking(updated)

    try {
      await api.patch<{ tenant: Tenant }>("/api/v1/auth/me", {
        settings: { tracking: updated }
      })
      toast.success("Tracking preferences updated")
    } catch {
      toast.error("Failed to update tracking")
      setTracking(prev)
    }
  }

  async function handleDeleteProject() {
    if (deleteConfirm !== tenant?.name) return
    setIsDeleting(true)
    try {
      await api.delete("/api/v1/auth/me")
      authService.logout()
    } catch {
      toast.error("Could not delete project")
      setIsDeleting(false)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <PageShell maxWidth="narrow" gap="lg">
        <PageHeader title="Settings" subtitle="Project configuration and preferences" />
        <div className="space-y-4" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </PageShell>
    )
  }

  // Error state
  if (isError) {
    return (
      <PageShell maxWidth="narrow" gap="lg">
        <PageHeader title="Settings" subtitle="Project configuration and preferences" />
        <SectionError message="Failed to load settings" onRetry={refetch} />
      </PageShell>
    )
  }

  return (
    <PageShell maxWidth="narrow" gap="lg">
      <PageHeader title="Settings" subtitle="Project configuration and preferences" />

      {/* Project info (read-only) */}
      <section>
        <h2 className="text-sm font-semibold mb-4 pb-2 border-b border-border">Project</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Project slug</Label>
            <div className="h-9 rounded-md border border-input bg-muted/30 px-3 flex items-center font-mono text-sm text-muted-foreground">
              {tenant?.slug ?? "—"}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Project ID</Label>
            <div className="h-9 rounded-md border border-input bg-muted/30 px-3 flex items-center font-mono text-xs text-muted-foreground">
              {tenant?.id ?? "—"}
            </div>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          To update your project name, visit{" "}
          <a href="/dashboard/profile" className="underline underline-offset-4 hover:text-foreground transition-colors">
            Profile
          </a>.
        </p>
      </section>

      {/* Notifications */}
      <section>
        <h2 className="text-sm font-semibold mb-4 pb-2 border-b border-border">Notifications</h2>
        <div className="space-y-3">
          {NOTIFICATIONS.map((item) => {
            const isChecked = notifications[item.id] !== false
            return (
              <label key={item.id} className="flex items-center justify-between gap-4 py-1 cursor-pointer">
                <div>
                  <p className="text-sm">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => toggleNotification(item.id, e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
              </label>
            )
          })}
        </div>
      </section>

      {/* Email tracking */}
      <section>
        <h2 className="text-sm font-semibold mb-1 pb-2 border-b border-border">Email tracking</h2>
        <p className="mt-2 text-xs text-muted-foreground mb-4">
          First-party open and click tracking augments provider-native tracking. Disable per category if your recipients consider tracking pixels a privacy concern. A per-send <span className="font-mono">metadata.track_opens</span> / <span className="font-mono">metadata.track_clicks</span> field overrides these defaults for transactional flows.
        </p>
        <div className="space-y-3">
          <label className="flex items-center justify-between gap-4 py-1 cursor-pointer">
            <div>
              <p className="text-sm">Open tracking</p>
              <p className="text-xs text-muted-foreground">Inject a 1×1 pixel into HTML emails to record opens.</p>
            </div>
            <input
              type="checkbox"
              checked={tracking.opens}
              onChange={(e) => toggleTracking("opens", e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
              aria-label="Toggle open tracking"
            />
          </label>
          <label className="flex items-center justify-between gap-4 py-1 cursor-pointer">
            <div>
              <p className="text-sm">Click tracking</p>
              <p className="text-xs text-muted-foreground">Rewrite outbound links through a redirector to record clicks.</p>
            </div>
            <input
              type="checkbox"
              checked={tracking.clicks}
              onChange={(e) => toggleTracking("clicks", e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
              aria-label="Toggle click tracking"
            />
          </label>
        </div>
      </section>

      {/* Danger zone */}
      <section>
        <h2 className="text-sm font-semibold mb-4 pb-2 border-b border-destructive/30 text-destructive">
          Danger zone
        </h2>
        <div className="flex items-center justify-between rounded-md border border-destructive/20 bg-destructive/4 px-4 py-3">
          <div>
            <p className="text-sm font-medium">Delete project</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Permanently delete &ldquo;{tenant?.name}&rdquo; and all associated data.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => setDeleteOpen(true)}
          >
            Delete project
          </Button>
        </div>
      </section>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete project</DialogTitle>
            <DialogDescription>
              This action cannot be undone. All emails, API keys, domains, and settings will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="delete-confirm">
                Type <span className="font-mono font-semibold">{tenant?.name}</span> to confirm
              </Label>
              <Input
                id="delete-confirm"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={tenant?.name}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setDeleteOpen(false); setDeleteConfirm("") }} disabled={isDeleting}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={deleteConfirm !== tenant?.name || isDeleting}
                onClick={handleDeleteProject}
              >
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete forever
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
