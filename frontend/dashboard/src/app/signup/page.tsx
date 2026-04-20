"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authService } from "@/services/auth.service"

const features = [
  "Multi-provider routing with automatic failover",
  "Bring your own keys — SES, SendGrid, Mailgun, SMTP",
  "Developer-first API with clean SDKs",
  "Real-time analytics and delivery tracking",
  "Webhook processing and event streaming",
  "Open source, self-hostable, zero lock-in",
]

export default function SignupPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      await authService.register({
        name: form.name,
        email: form.email,
        password: form.password,
        password_confirmation: form.password,
      })
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
      {/* Left panel — navy branded */}
      <div className="hidden lg:flex lg:w-[46%] flex-col justify-between bg-[#0F1E3C] p-10">
        {/* Logo */}
        <div className="flex items-center gap-[9px]">
          <div className="w-7 h-7 rounded-[7px] bg-[#2563EB] flex items-center justify-center text-[13px] font-bold text-white">
            C
          </div>
          <span className="text-[15px] font-semibold text-white tracking-[-0.01em]">
            Courier<span className="text-[#2563EB]">X</span>
          </span>
        </div>

        {/* Headline + features */}
        <div className="space-y-8">
          <div>
            <h2 className="text-[24px] font-semibold leading-snug text-white">
              One API. Any provider.
              <br />
              <span className="text-[#10B981]">Zero lock-in.</span>
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-[#94A3B8]">
              Bring your own provider keys, route across them, and fail over automatically when one goes down.
            </p>
          </div>

          <ul className="space-y-3">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-3 text-[13px] text-white/70">
                <div className="mt-0.5 w-4 h-4 rounded-full bg-[#10B981]/15 flex items-center justify-center shrink-0">
                  <Check className="h-2.5 w-2.5 text-[#10B981]" />
                </div>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { title: "Multi-provider routing", desc: "Automatic failover across providers" },
            { title: "Developer-first API", desc: "Clean SDKs, quick integration" },
            { title: "Enterprise-ready", desc: "Smart retries and rate limiting" },
            { title: "Zero lock-in", desc: "Your providers, your rules" },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-3"
            >
              <p className="text-[12px] font-semibold text-white/80">{card.title}</p>
              <p className="mt-1 text-[10px] text-white/30 leading-tight">{card.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center bg-[#F8FAFC] px-8 py-12">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-[9px] lg:hidden">
          <div className="w-7 h-7 rounded-[7px] bg-[#2563EB] flex items-center justify-center text-[13px] font-bold text-white">
            C
          </div>
          <span className="text-[15px] font-semibold tracking-[-0.01em]">
            Courier<span className="text-[#2563EB]">X</span>
          </span>
        </div>

        <div className="w-full max-w-[360px]">
          <div className="mb-8">
            <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-[#0F172A]">
              Create your account
            </h1>
            <p className="mt-1.5 text-[14px] text-[#64748B]">
              Get started in under 2 minutes
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-[12px] font-medium text-[#334155]">
                Workspace name
              </Label>
              <Input
                id="name"
                placeholder="Acme Inc."
                autoComplete="organization"
                value={form.name}
                onChange={set("name")}
                required
                className="h-[38px] rounded-lg border-[#E2E8F0] bg-white text-[14px] placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:ring-[rgba(37,99,235,0.35)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[12px] font-medium text-[#334155]">
                Work email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                autoComplete="email"
                value={form.email}
                onChange={set("email")}
                required
                className="h-[38px] rounded-lg border-[#E2E8F0] bg-white text-[14px] placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:ring-[rgba(37,99,235,0.35)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[12px] font-medium text-[#334155]">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Min 8 characters"
                autoComplete="new-password"
                minLength={8}
                value={form.password}
                onChange={set("password")}
                required
                className="h-[38px] rounded-lg border-[#E2E8F0] bg-white text-[14px] placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:ring-[rgba(37,99,235,0.35)]"
              />
            </div>

            {error && (
              <p className="text-[13px] text-[#EF4444]">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full h-[38px] gap-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-[14px] font-medium transition-colors"
              disabled={loading}
            >
              {loading ? "Creating account..." : (
                <>Create account <ArrowRight className="h-3.5 w-3.5" /></>
              )}
            </Button>
          </form>

          <p className="mt-4 text-center text-[12px] text-[#94A3B8]">
            By continuing you agree to our{" "}
            <Link href="/terms" className="underline underline-offset-4 hover:text-[#0F172A] transition-colors">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline underline-offset-4 hover:text-[#0F172A] transition-colors">
              Privacy Policy
            </Link>.
          </p>

          <p className="mt-4 text-center text-[14px] text-[#64748B]">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-[#0F172A] hover:text-[#2563EB] transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
