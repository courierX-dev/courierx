"use client"

import { useState } from "react"
import Link from "next/link"
import { Zap, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const stats = [
  { label: "Emails delivered",  value: "2.4B+" },
  { label: "Avg delivery rate", value: "99.2%" },
  { label: "Providers",         value: "6+" },
]

/* Minimal code snippet shown on the left panel */
const CODE_SNIPPET = `// One API. Every provider.
await courierx.send({
  to: "user@example.com",
  subject: "Welcome aboard",
  html: template.render(vars),
})
// Automatic failover ↓
// SES → SendGrid → Mailgun`

export default function LoginPage() {
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    // TODO: authService.login({ email, password })
    setTimeout(() => {
      setLoading(false)
      window.location.href = "/dashboard"
    }, 900)
  }

  return (
    <div className="flex min-h-screen">
      {/* ── Left — branded dark panel ─────────────────────── */}
      <div className="hidden lg:flex lg:w-[46%] flex-col justify-between bg-sidebar border-r border-sidebar-border p-10">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <Zap className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="font-semibold tracking-tight text-sidebar-foreground">
            CourierX
          </span>
        </div>

        {/* Headline + tagline */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold leading-snug text-sidebar-foreground">
              One API, multiple providers,<br />
              <span className="text-success">zero lock-in.</span>
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-sidebar-foreground/55">
              Send through SES, SendGrid, Mailgun, SMTP and more — with
              automatic failover and smart routing built in.
            </p>
          </div>

          {/* Code block */}
          <div className="rounded-lg border border-sidebar-border bg-background/60 backdrop-blur-sm overflow-hidden">
            <div className="flex items-center gap-1.5 border-b border-sidebar-border px-3 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
              <span className="ml-2 text-[10px] text-sidebar-foreground/30 font-mono">
                send.ts
              </span>
            </div>
            <pre className="px-4 py-3 font-mono text-[11px] leading-relaxed text-sidebar-foreground/70 overflow-x-auto">
              <code>{CODE_SNIPPET}</code>
            </pre>
          </div>

          {/* Quote */}
          <div className="border-l-2 border-success/40 pl-4">
            <p className="text-sm text-sidebar-foreground/70 italic leading-relaxed">
              "Cut our bounce rate from 8% to under 2% in the first week.
              The automatic failover is a game-changer."
            </p>
            <p className="mt-2 text-xs text-sidebar-foreground/40">
              — Sarah Chen, CTO at Archetype Labs
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-md border border-sidebar-border bg-sidebar-accent/30 px-3 py-2.5"
            >
              <div className="text-lg font-bold text-success">{s.value}</div>
              <div className="mt-0.5 text-[10px] text-sidebar-foreground/40 leading-tight">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right — form ──────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-8">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <Zap className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="font-semibold tracking-tight">CourierX</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-7">
            <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Welcome back — enter your credentials below
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading ? "Signing in…" : (
                <>Sign in <ArrowRight className="h-3.5 w-3.5" /></>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-medium text-foreground hover:text-primary transition-colors"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
