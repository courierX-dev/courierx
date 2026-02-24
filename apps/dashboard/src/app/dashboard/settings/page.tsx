"use client"

import { useState, useEffect } from "react"
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
import type { Tenant } from "@/types/auth"
import api from "@/services/api"
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"

const NOTIFICATIONS = [
  { id: "failover_events",   label: "Failover events",   desc: "Notify when a provider failover occurs" },
  { id: "usage_alerts",      label: "Usage alerts",      desc: "Notify when usage exceeds 80% of plan limit" },
  { id: "bounce_rate_spike", label: "Bounce rate spike", desc: "Notify when bounce rate exceeds 5%" },
  { id: "weekly_summary",    label: "Weekly summary",    desc: "Weekly email summary of delivery performance" },
]

export default function SettingsPage() {
  const [tenant, setTenant]               = useState<Tenant | null>(null)
  const [deleteOpen, setDeleteOpen]       = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState("")
  const [isDeleting, setIsDeleting]       = useState(false)
  const [notifications, setNotifications] = useState<Record<string, boolean>>({})
  const { toast } = useToast()

  useEffect(() => {
    fetchTenantDetails()
  }, [])

  async function fetchTenantDetails() {
    try {
      const data = await authService.getCurrentUser()
      setTenant(data)
      const settings = (data.settings || {}) as Record<string, unknown>
      const notifs = (settings.notifications || {}) as Record<string, boolean>
      setNotifications(notifs)
    } catch {
      toast({ title: "Error", description: "Could not load settings" })
    }
  }

  async function toggleNotification(id: string, checked: boolean) {
    const updated = { ...notifications, [id]: checked }
    setNotifications(updated)

    try {
      await api.patch<{ tenant: Tenant }>("/api/v1/auth/me", {
        settings: { notifications: updated }
      })
      toast({ title: "Settings saved", description: "Notification preferences updated." })
    } catch {
      toast({ title: "Error", description: "Failed to update preferences.", variant: "destructive" })
      setNotifications(notifications) // revert
    }
  }

  async function handleDeleteProject() {
    if (deleteConfirm !== tenant?.name) return
    setIsDeleting(true)
    try {
      await api.delete("/api/v1/auth/me")
      // Force clear local storage and redirect
      authService.logout()
    } catch {
      toast({ title: "Error", description: "Could not delete project.", variant: "destructive" })
      setIsDeleting(false)
    }
  }

  if (!tenant) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-base font-semibold tracking-tight">Settings</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">Project configuration and preferences</p>
      </div>

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
            // Default to true if not explicitly set
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

      {/* Danger zone */}
      <section>
        <h2 className="text-sm font-semibold mb-4 pb-2 border-b border-destructive/30 text-destructive">
          Danger zone
        </h2>
        <div className="flex items-center justify-between rounded-md border border-destructive/20 bg-destructive/[0.03] px-4 py-3">
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
    </div>
  )
}
