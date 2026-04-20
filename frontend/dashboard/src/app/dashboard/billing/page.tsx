"use client"

import { CheckCircle2, ArrowUpRight, Zap, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageShell } from "@/components/dashboard/page-shell"
import { PageHeader } from "@/components/dashboard/page-header"

const PLAN_FEATURES = [
  "Unlimited emails",
  "6 provider integrations",
  "Automatic failover routing",
  "Webhook event processing",
  "Template management",
  "90-day message history",
  "Priority support",
]

export default function BillingPage() {
  return (
    <PageShell>
      <PageHeader title="Billing & Usage" subtitle="Manage your subscription and view usage" />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Current plan */}
        <div className="rounded-xl border border-primary/25 bg-primary/5 p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
                <Zap className="h-3 w-3 text-primary-foreground" />
              </div>
              <span className="text-sm font-semibold">Open Source</span>
            </div>
            <span className="inline-flex items-center rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
              Active
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold font-mono">Free</span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Self-hosted, no limits
            </p>
          </div>

          <ul className="space-y-2 flex-1">
            {PLAN_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success mt-0.5" />
                {f}
              </li>
            ))}
          </ul>

          <Button size="sm" className="w-full gap-1.5" disabled>
            <ArrowUpRight className="h-3.5 w-3.5" />
            Upgrade to Cloud
          </Button>
        </div>

        {/* Usage + coming soon */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Usage placeholder */}
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="text-xs font-medium text-muted-foreground mb-4">Monthly usage</p>
            <div className="flex items-end justify-between mb-3">
              <div>
                <span className="text-2xl font-bold font-mono tabular-nums">Unlimited</span>
                <span className="ml-1 text-sm text-muted-foreground font-mono">emails</span>
              </div>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary w-0" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Self-hosted deployments have no email limits. Usage is governed by your provider rate limits.
            </p>
          </div>

          {/* Billing coming soon */}
          <div className="rounded-xl border border-border bg-card p-8 flex flex-col items-center justify-center text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Lock className="h-5 w-5 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold">Cloud billing coming soon</h3>
            <p className="mt-1.5 text-xs text-muted-foreground max-w-sm leading-relaxed">
              Managed cloud plans with usage-based billing, dedicated infrastructure, and SLA guarantees
              will be available in a future release. Self-hosted users enjoy unlimited usage.
            </p>
          </div>
        </div>
      </div>
    </PageShell>
  )
}
