"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authService } from "@/services/auth.service"

const CODE_SNIPPET = `// One API. Every provider.
await courierx.send({
  to: "user@example.com",
  subject: "Welcome aboard",
  html: template.render(vars),
})
// Automatic failover
// SES > SendGrid > Mailgun`

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      await authService.login({ email, password })
      window.location.href = "/dashboard/overview"
    } catch {
      setError("Invalid email or password. Please try again.")
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

        {/* Headline */}
        <div className="space-y-8">
          <div>
            <h2 className="text-[24px] font-semibold leading-snug text-white">
              One API, multiple providers,
              <br />
              <span className="text-[#10B981]">zero lock-in.</span>
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-[#94A3B8]">
              Send through SES, SendGrid, Mailgun, SMTP and more — with
              automatic failover and smart routing built in.
            </p>
          </div>

          {/* Code block */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] overflow-hidden">
            <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-4 py-2.5">
              <span className="h-[9px] w-[9px] rounded-full bg-[#EF4444]/50" />
              <span className="h-[9px] w-[9px] rounded-full bg-[#F59E0B]/50" />
              <span className="h-[9px] w-[9px] rounded-full bg-[#10B981]/50" />
              <span className="ml-3 text-[10px] text-white/25 font-mono">send.ts</span>
            </div>
            <pre className="px-4 py-3 font-mono text-[11px] leading-[1.8] text-[#94A3B8] overflow-x-auto">
              <code>{CODE_SNIPPET}</code>
            </pre>
          </div>

          {/* Quote */}
          <div className="border-l-2 border-[#10B981]/30 pl-4">
            <p className="text-[13px] text-white/60 italic leading-relaxed">
              &ldquo;Cut our bounce rate from 8% to under 2% in the first week.
              The automatic failover is a game-changer.&rdquo;
            </p>
            <p className="mt-2 text-[12px] text-white/30">
              &mdash; Sarah Chen, CTO at Archetype Labs
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Emails delivered", value: "2.4B+" },
            { label: "Avg delivery rate", value: "99.2%" },
            { label: "Providers supported", value: "6+" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-3"
            >
              <div className="text-[18px] font-semibold text-[#10B981] tabular-nums">{s.value}</div>
              <div className="mt-1 text-[10px] text-white/30 leading-tight">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center bg-[#F8FAFC] px-8">
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
              Sign in
            </h1>
            <p className="mt-1.5 text-[14px] text-[#64748B]">
              Welcome back — enter your credentials below
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[12px] font-medium text-[#334155]">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-[38px] rounded-lg border-[#E2E8F0] bg-white text-[14px] placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:ring-[rgba(37,99,235,0.35)]"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[12px] font-medium text-[#334155]">
                  Password
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-[12px] text-[#64748B] hover:text-[#2563EB] hover:underline transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              {loading ? "Signing in..." : (
                <>Sign in <ArrowRight className="h-3.5 w-3.5" /></>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-[14px] text-[#64748B]">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-medium text-[#0F172A] hover:text-[#2563EB] transition-colors"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
