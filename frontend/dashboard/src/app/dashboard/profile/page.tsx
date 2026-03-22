"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authService } from "@/services/auth.service"
import { useAuthStore } from "@/stores/auth.store"
import type { Tenant } from "@/types/auth"

export default function ProfilePage() {
  const storeTenant = useAuthStore((s) => s.tenant)
  const hydrate = useAuthStore((s) => s.hydrate)
  const hydrated = useAuthStore((s) => s.hydrated)
  const [tenant, setTenant]         = useState<Tenant | null>(null)
  const [name, setName]             = useState("")
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)
  const [error, setError]           = useState("")

  useEffect(() => {
    if (!hydrated) hydrate()
  }, [hydrated, hydrate])

  useEffect(() => {
    if (storeTenant) { setTenant(storeTenant); setName(storeTenant.name) }
    authService.getCurrentUser().then((t) => {
      setTenant(t)
      setName(t.name)
    }).catch(() => {})
  }, [storeTenant])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      const updated = await authService.updateName(name)
      setTenant(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { errors?: string[] } } }
      setError(apiErr.response?.data?.errors?.[0] ?? "Failed to save.")
    } finally {
      setSaving(false)
    }
  }

  const initials = tenant?.name ? tenant.name.slice(0, 2).toUpperCase() : "…"

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-base font-semibold tracking-tight">Profile</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">Your account identity</p>
      </div>

      {/* Avatar + name */}
      <section className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center font-mono text-lg font-semibold text-muted-foreground">
          {initials}
        </div>
        <div>
          <p className="text-sm font-medium">{tenant?.name ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{tenant?.email ?? "—"}</p>
        </div>
      </section>

      {/* Edit name */}
      <section>
        <h2 className="text-sm font-semibold mb-4 pb-2 border-b border-border">Account details</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="profile-name">Display name</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!tenant}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <div className="h-9 rounded-md border border-input bg-muted/30 px-3 flex items-center font-mono text-sm text-muted-foreground">
                {tenant?.email ?? "—"}
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Account ID</Label>
              <div className="h-9 rounded-md border border-input bg-muted/30 px-3 flex items-center font-mono text-xs text-muted-foreground">
                {tenant?.id ?? "—"}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Mode</Label>
              <div className="h-9 rounded-md border border-input bg-muted/30 px-3 flex items-center text-sm text-muted-foreground capitalize">
                {tenant?.mode ?? "—"}
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <div className="h-9 rounded-md border border-input bg-muted/30 px-3 flex items-center text-sm text-muted-foreground capitalize">
                {tenant?.status ?? "—"}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Member since</Label>
              <div className="h-9 rounded-md border border-input bg-muted/30 px-3 flex items-center font-mono text-xs text-muted-foreground">
                {tenant?.created_at ? new Date(tenant.created_at).toLocaleDateString() : "—"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={saving || !tenant}>
              {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
            </Button>
            {saved && <span className="text-xs text-success">Changes saved.</span>}
            {error && <span className="text-xs text-destructive">{error}</span>}
          </div>
        </form>
      </section>
    </div>
  )
}
