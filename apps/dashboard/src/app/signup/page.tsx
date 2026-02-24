"use client"

import { useState } from "react"
import Link from "next/link"
import { Zap, CheckCircle2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authService } from "@/services/auth.service"

const features = [
  "Multi-Provider Routing — Gmail, Outlook, SendGrid, SES & more",
  "Automatic failover with intelligent switching",
  "Developer-First API with clean SDKs & comprehensive docs",
  "Enterprise-Ready Scale with real-time analytics",
  "Webhook processing & event tracking",
  "Free 14-day trial · No credit card required",
]

export default function SignupPage() {
  const [form, setForm] = useState({
    first_name:   "",
    last_name:    "",
    email:        "",
    password:     "",
    tenant_name:  "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState("")

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      await authService.register({ name: form.tenant_name, email: form.email })
      window.location.href = "/dashboard/overview"
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { errors?: string[] } } }
      setError(apiErr.response?.data?.errors?.[0] ?? "Failed to create account. Please try again.")
    } finally {
      setLoading(false)
    }
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

        {/* Headline */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold leading-snug text-sidebar-foreground">
              Multi-Provider Email<br />
              <span className="text-success">Infrastructure.</span>
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-sidebar-foreground/55">
              Send and receive email across multiple providers with automatic
              failover and redundancy. Connect Gmail, Outlook, SMTP, SendGrid
              &amp; more through one developer-first API.
            </p>
          </div>

          <ul className="space-y-3">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-sidebar-foreground/70">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { title: "Multi-Provider Routing",    desc: "Never worry about downtime" },
            { title: "Developer-First API",       desc: "Clean SDKs, quick starts"  },
            { title: "Enterprise-Ready Scale",    desc: "Smart retries & analytics"  },
            { title: "Zero Lock-in",              desc: "Your providers, your rules" },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-md border border-sidebar-border bg-sidebar-accent/25 p-3"
            >
              <p className="text-xs font-semibold text-sidebar-foreground/80">{card.title}</p>
              <p className="mt-0.5 text-[10px] text-sidebar-foreground/40">{card.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right — form ──────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-8 py-12">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <Zap className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="font-semibold tracking-tight">CourierX</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-7">
            <h1 className="text-xl font-semibold tracking-tight">Create your account</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Get started in under 2 minutes
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="first_name">First name</Label>
                <Input
                  id="first_name"
                  placeholder="Alex"
                  autoComplete="given-name"
                  value={form.first_name}
                  onChange={set("first_name")}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="last_name">Last name</Label>
                <Input
                  id="last_name"
                  placeholder="Johnson"
                  autoComplete="family-name"
                  value={form.last_name}
                  onChange={set("last_name")}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tenant_name">Company name</Label>
              <Input
                id="tenant_name"
                placeholder="Acme Inc."
                autoComplete="organization"
                value={form.tenant_name}
                onChange={set("tenant_name")}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                placeholder="alex@acme.com"
                autoComplete="email"
                value={form.email}
                onChange={set("email")}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Min 8 characters"
                autoComplete="new-password"
                minLength={8}
                value={form.password}
                onChange={set("password")}
                required
              />
            </div>

            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading ? "Creating account…" : (
                <>Create account <ArrowRight className="h-3.5 w-3.5" /></>
              )}
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            By continuing you agree to our{" "}
            <Link href="/terms" className="underline underline-offset-4 hover:text-foreground transition-colors">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground transition-colors">
              Privacy Policy
            </Link>.
          </p>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-foreground hover:text-primary transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
