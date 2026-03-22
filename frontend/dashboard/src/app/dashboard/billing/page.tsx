"use client"

import { CheckCircle2, Download, ArrowUpRight, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { PageShell } from "@/components/dashboard/page-shell"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionError } from "@/components/dashboard/inline-error"
import { cn } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"
import api from "@/services/api"

const PLAN_FEATURES = [
  "10,000 emails / month",
  "6 provider integrations",
  "Automatic failover routing",
  "Webhook event processing",
  "Template management",
  "30-day message history",
  "Standard support",
]

export default function BillingPage() {
  const { data: billing, isLoading } = useQuery({
    queryKey: ["dashboard", "billing"],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/dashboard/billing")
      return data
    }
  })

  if (isLoading) {
    return (
      <PageShell>
        <PageHeader title="Billing & Usage" subtitle="Manage your subscription and view past invoices" />
        <div className="grid lg:grid-cols-3 gap-6" aria-busy="true">
          <div className="h-80 rounded-lg bg-muted animate-pulse" />
          <div className="lg:col-span-2 space-y-6">
            <div className="h-36 rounded-lg bg-muted animate-pulse" />
            <div className="h-48 rounded-lg bg-muted animate-pulse" />
          </div>
        </div>
      </PageShell>
    )
  }

  if (!billing) {
    return (
      <PageShell>
        <PageHeader title="Billing & Usage" subtitle="Manage your subscription and view past invoices" />
        <SectionError message="Failed to load billing data" />
      </PageShell>
    )
  }

  const { used, limit } = billing.usage
  const pct = Math.round((used / limit) * 100)
  const invoices = billing.invoices || []

  return (
    <PageShell>
      <PageHeader title="Billing & Usage" subtitle="Manage your subscription and view past invoices" />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Plan card */}
        <div className="rounded-lg border border-primary/25 bg-primary/5 p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
                <Zap className="h-3 w-3 text-primary-foreground" />
              </div>
              <span className="text-sm font-semibold capitalize">{billing.plan} Plan</span>
            </div>
            <StatusBadge status="active" />
          </div>

          <div>
            <div className="flex items-baseline gap-1">
              {billing.plan === "free" ? (
                 <span className="text-3xl font-bold font-mono">$0</span>
              ) : billing.plan === "starter" ? (
                 <span className="text-3xl font-bold font-mono">$29</span>
              ) : billing.plan === "pro" ? (
                 <span className="text-3xl font-bold font-mono">$79</span>
              ) : (
                 <span className="text-3xl font-bold font-mono">Custom</span>
              )}
              <span className="text-xs text-muted-foreground">/ month</span>
            </div>
            {billing.current_period_ends_at && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Renews {new Date(billing.current_period_ends_at).toLocaleDateString()}
              </p>
            )}
          </div>

          <ul className="space-y-2 flex-1">
            {PLAN_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success mt-0.5" />
                {f}
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-2">
            <Button size="sm" className="w-full gap-1.5" disabled>
              <ArrowUpRight className="h-3.5 w-3.5" />
              Upgrade to Enterprise
            </Button>
            <Button size="sm" variant="ghost" className="w-full text-muted-foreground" disabled>
              Manage subscription
            </Button>
          </div>
        </div>

        {/* Usage + Invoices */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Usage */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <p className="text-xs font-medium">Monthly usage</p>
            <div className="flex items-end justify-between">
              <div>
                <span className="text-2xl font-bold font-mono tabular-nums">{used.toLocaleString()}</span>
                <span className="ml-1 text-sm text-muted-foreground font-mono">
                  / {limit.toLocaleString()} emails
                </span>
              </div>
              <span className={cn(
                "text-sm font-semibold font-mono",
                pct > 90 ? "text-destructive" : pct > 70 ? "text-warning" : "text-success",
              )}>
                {pct}%
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  pct > 90 ? "bg-destructive" : pct > 70 ? "bg-warning" : "bg-primary",
                )}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.max(0, limit - used).toLocaleString()} emails remaining this month
            </p>

            {pct > 80 && (
              <div className="rounded-md border border-warning/25 bg-warning/10 px-3 py-2.5 text-xs text-warning-foreground">
                You&apos;ve used {pct}% of your monthly allowance.{" "}
                <button className="font-medium underline underline-offset-4 hover:opacity-80">
                  Upgrade your plan
                </button>{" "}
                to avoid disruptions.
              </div>
            )}
          </div>

          {/* Invoices */}
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border bg-muted/20">
              <p className="text-xs font-medium">Invoice history</p>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Date</th>
                  <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Amount</th>
                  <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Invoice</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv: { id: string | number; date: string; amount: string; status: "paid" | "pending" | "failed" }, i: number) => (
                  <tr
                    key={String(inv.id)}
                    className={cn(
                      "hover:bg-muted/20 transition-colors",
                      i < invoices.length - 1 && "border-b border-border/50",
                    )}
                  >
                    <td className="px-4 py-2.5 text-sm">{inv.date}</td>
                    <td className="px-4 py-2.5 text-sm font-mono font-medium">{inv.amount}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-muted-foreground"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageShell>
  )
}
