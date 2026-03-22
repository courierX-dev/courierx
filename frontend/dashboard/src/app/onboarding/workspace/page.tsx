"use client"

import { useState } from "react"
import Link from "next/link"
import { Zap, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function slugify(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

export default function OnboardingWorkspacePage() {
  const [name, setName]   = useState("")
  const [loading, setLoading] = useState(false)

  const slug = slugify(name)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      window.location.href = "/onboarding/project"
    }, 600)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-10">
        <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
          <Zap className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold tracking-tight">CourierX</span>
      </Link>

      <div className="w-full max-w-sm">
        {/* Progress */}
        <div className="flex items-center gap-1.5 mb-8">
          <div className="h-1 w-8 rounded-full bg-primary" />
          <div className="h-1 flex-1 rounded-full bg-border" />
          <div className="h-1 flex-1 rounded-full bg-border" />
          <span className="ml-2 text-[10px] font-mono text-muted-foreground">1 of 3</span>
        </div>

        <div className="mb-7">
          <h1 className="text-lg font-semibold tracking-tight">Create your workspace</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A workspace holds your projects and team members.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="workspace-name">Workspace name</Label>
            <Input
              id="workspace-name"
              placeholder="Acme Corp"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>

          {name && (
            <div className="space-y-1.5">
              <Label>URL slug</Label>
              <div className="flex items-center h-9 rounded-md border border-input bg-muted/30 px-3 gap-1 text-sm">
                <span className="text-muted-foreground">courierx.dev/</span>
                <span className="font-mono text-foreground">{slug}</span>
              </div>
            </div>
          )}

          <Button type="submit" className="w-full gap-2" disabled={loading || !name}>
            {loading ? "Creating…" : (
              <>Continue <ArrowRight className="h-3.5 w-3.5" /></>
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
