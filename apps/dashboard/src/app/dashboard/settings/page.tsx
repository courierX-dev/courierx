"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ModeBadge } from "@/components/ui/mode-badge"
import { PROJECT, WORKSPACE } from "@/lib/mock-data"

export default function SettingsPage() {
  const [projectName, setProjectName] = useState(PROJECT.name)
  const [saved, setSaved]             = useState(false)

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-base font-semibold tracking-tight">Settings</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">Project configuration</p>
      </div>

      {/* Project settings */}
      <section>
        <h2 className="text-sm font-semibold mb-4 pb-2 border-b border-border">Project</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="project-name">Project name</Label>
              <Input
                id="project-name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Project ID</Label>
              <div className="h-9 rounded-md border border-input bg-muted/30 px-3 flex items-center font-mono text-sm text-muted-foreground">
                {PROJECT.id}
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Mode</Label>
              <div className="h-9 rounded-md border border-input bg-muted/30 px-3 flex items-center gap-2">
                <ModeBadge mode={PROJECT.mode} />
                <span className="text-xs text-muted-foreground capitalize">{PROJECT.mode}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="timezone">Timezone</Label>
              <select
                id="timezone"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                defaultValue="UTC"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York</option>
                <option value="America/Los_Angeles">America/Los_Angeles</option>
                <option value="Europe/London">Europe/London</option>
                <option value="Asia/Tokyo">Asia/Tokyo</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" size="sm">
              {saved ? "Saved" : "Save changes"}
            </Button>
            {saved && (
              <span className="text-xs text-success">Changes saved.</span>
            )}
          </div>
        </form>
      </section>

      {/* Workspace */}
      <section>
        <h2 className="text-sm font-semibold mb-4 pb-2 border-b border-border">Workspace</h2>
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Workspace name</Label>
              <div className="h-9 rounded-md border border-input bg-muted/30 px-3 flex items-center text-sm text-muted-foreground">
                {WORKSPACE.name}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Plan</Label>
              <div className="h-9 rounded-md border border-input bg-muted/30 px-3 flex items-center gap-2">
                <span className="inline-flex items-center rounded border border-primary/25 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                  {WORKSPACE.plan}
                </span>
                <span className="text-xs text-muted-foreground">{WORKSPACE.usage.used.toLocaleString()} / {WORKSPACE.usage.limit.toLocaleString()} emails</span>
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Members</Label>
            <div className="h-9 rounded-md border border-input bg-muted/30 px-3 flex items-center text-sm text-muted-foreground">
              {WORKSPACE.member_count} members
            </div>
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section>
        <h2 className="text-sm font-semibold mb-4 pb-2 border-b border-border">Notifications</h2>
        <div className="space-y-3">
          {[
            { label: "Failover events",       desc: "Notify when a provider failover occurs"        },
            { label: "Usage alerts",           desc: "Notify when usage exceeds 80% of plan limit"   },
            { label: "Bounce rate spike",      desc: "Notify when bounce rate exceeds 5%"            },
            { label: "Weekly summary",         desc: "Weekly email summary of delivery performance"  },
          ].map((item) => (
            <label key={item.label} className="flex items-center justify-between gap-4 py-1 cursor-pointer">
              <div>
                <p className="text-sm">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-border accent-primary"
              />
            </label>
          ))}
        </div>
      </section>

      {/* Danger zone */}
      <section>
        <h2 className="text-sm font-semibold mb-4 pb-2 border-b border-destructive/30 text-destructive">
          Danger zone
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-md border border-destructive/20 bg-destructive/[0.03] px-4 py-3">
            <div>
              <p className="text-sm font-medium">Delete project</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Permanently delete &ldquo;{PROJECT.name}&rdquo; and all associated data.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              Delete project
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
