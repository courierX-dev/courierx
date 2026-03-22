"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useCurrentTenant, useUpdateProfile } from "@/hooks/use-auth"
import { PageShell } from "@/components/dashboard/page-shell"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionError } from "@/components/dashboard/inline-error"

export default function ProfilePage() {
  const { data: tenant, isLoading, isError, refetch } = useCurrentTenant()
  const updateMutation = useUpdateProfile()
  const [name, setName]   = useState("")
  const [saved, setSaved] = useState(false)

  // Sync name input when tenant data loads
  useEffect(() => {
    if (tenant?.name) setName(tenant.name)
  }, [tenant?.name])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    try {
      await updateMutation.mutateAsync(name)
      setSaved(true)
      toast.success("Profile updated")
      setTimeout(() => setSaved(false), 2000)
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { errors?: string[] } } }
      toast.error(apiErr.response?.data?.errors?.[0] ?? "Failed to save.")
    }
  }

  const initials = tenant?.name ? tenant.name.slice(0, 2).toUpperCase() : "…"

  // Loading state
  if (isLoading) {
    return (
      <PageShell maxWidth="narrow" gap="lg">
        <PageHeader title="Profile" subtitle="Your account identity" />
        <div className="space-y-4" aria-busy="true">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-muted animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-32 rounded bg-muted animate-pulse" />
              <div className="h-3 w-48 rounded bg-muted animate-pulse" />
            </div>
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
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
        <PageHeader title="Profile" subtitle="Your account identity" />
        <SectionError message="Failed to load profile" onRetry={refetch} />
      </PageShell>
    )
  }

  return (
    <PageShell maxWidth="narrow" gap="lg">
      <PageHeader title="Profile" subtitle="Your account identity" />

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
            <Button type="submit" size="sm" disabled={updateMutation.isPending || !tenant}>
              {updateMutation.isPending ? "Saving…" : saved ? "Saved" : "Save changes"}
            </Button>
            {saved && <span className="text-xs text-success">Changes saved.</span>}
            {updateMutation.isError && <span className="text-xs text-destructive">Failed to save.</span>}
          </div>
        </form>
      </section>
    </PageShell>
  )
}
