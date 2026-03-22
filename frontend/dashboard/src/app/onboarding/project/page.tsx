"use client"

import { useState } from "react"
import Link from "next/link"
import { Zap, ArrowRight, FlaskConical, Plug, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { ProjectMode } from "@/types/auth"

const MODES: {
  id: ProjectMode
  icon: React.ElementType
  label: string
  description: string
  note: string
}[] = [
  {
    id:          "demo",
    icon:        FlaskConical,
    label:       "Demo",
    description: "Sandbox environment with test data. No real emails sent.",
    note:        "100 test emails/day · No credentials needed",
  },
  {
    id:          "byok",
    icon:        Plug,
    label:       "BYOK",
    description: "Bring your own providers. Connect Gmail, SES, SendGrid, and more.",
    note:        "Your provider accounts · You control limits",
  },
  {
    id:          "managed",
    icon:        Shield,
    label:       "Managed",
    description: "Full infrastructure managed by CourierX with compliance and SLA.",
    note:        "Included in Pro+ plans · Priority routing",
  },
]

export default function OnboardingProjectPage() {
  const [projectName, setProjectName] = useState("")
  const [mode, setMode]               = useState<ProjectMode | null>(null)
  const [loading, setLoading]         = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!mode) return
    setLoading(true)
    setTimeout(() => {
      window.location.href = "/dashboard/overview"
    }, 700)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-10">
        <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
          <Zap className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold tracking-tight">CourierX</span>
      </Link>

      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-1.5 mb-8">
          <div className="h-1 w-8 rounded-full bg-primary" />
          <div className="h-1 w-8 rounded-full bg-primary" />
          <div className="h-1 flex-1 rounded-full bg-border" />
          <span className="ml-2 text-[10px] font-mono text-muted-foreground">2 of 3</span>
        </div>

        <div className="mb-7">
          <h1 className="text-lg font-semibold tracking-tight">Create your first project</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a mode that fits your needs. You can create more projects later.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Project name */}
          <div className="space-y-1.5">
            <Label htmlFor="project-name">Project name</Label>
            <Input
              id="project-name"
              placeholder="Production"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              required
            />
          </div>

          {/* Mode selection */}
          <div className="space-y-2">
            <Label>Project mode</Label>
            <div className="grid gap-2">
              {MODES.map(({ id, icon: Icon, label, description, note }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMode(id)}
                  className={cn(
                    "flex items-start gap-4 rounded-lg border p-4 text-left transition-colors",
                    mode === id
                      ? "border-primary bg-primary/[0.04]"
                      : "border-border hover:border-border/80 hover:bg-muted/20",
                  )}
                >
                  <div className={cn(
                    "h-8 w-8 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5",
                    mode === id ? "bg-primary/10" : "bg-muted/50",
                  )}>
                    <Icon className={cn("h-4 w-4", mode === id ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{label}</span>
                      {mode === id && (
                        <span className="inline-flex items-center rounded border border-primary/25 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                          selected
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
                    <p className="mt-1.5 text-[10px] font-mono text-muted-foreground/60">{note}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full gap-2"
            disabled={loading || !projectName || !mode}
          >
            {loading ? "Creating project…" : (
              <>Create project <ArrowRight className="h-3.5 w-3.5" /></>
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
