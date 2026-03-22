"use client"

import { CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react"
import { TrustScore } from "@/components/ui/trust-score"
import { cn } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"
import api from "@/services/api"

type CheckStatus = "pass" | "fail" | "warn"

const CHECK_ICON: Record<CheckStatus, React.ReactNode> = {
  pass: <CheckCircle2 className="h-4 w-4 text-success shrink-0" />,
  fail: <XCircle      className="h-4 w-4 text-destructive shrink-0" />,
  warn: <AlertCircle  className="h-4 w-4 text-warning shrink-0"    />,
}

const CHECK_TEXT: Record<CheckStatus, string> = {
  pass: "text-foreground",
  fail: "text-destructive",
  warn: "text-warning",
}

export default function CompliancePage() {
  const { data: compliance, isLoading } = useQuery({
    queryKey: ["dashboard", "compliance"],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/dashboard/compliance")
      return data
    }
  })

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!compliance) return <div className="text-red-400">Failed to load compliance metrics.</div>

  const checks: { label: string; description: string; status: CheckStatus }[] = compliance.checks || []
  const domains: { id: string; domain: string; type: string; dkim: boolean; spf: boolean; dmarc: boolean }[] = compliance.domains || []
  
  const pass = checks.filter((c) => c.status === "pass").length
  const fail = checks.filter((c) => c.status === "fail").length
  const warn = checks.filter((c) => c.status === "warn").length

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-base font-semibold tracking-tight">Compliance</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Email authentication and deliverability health
        </p>
      </div>

      {/* Score + summary */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Trust score */}
        <div className="rounded-lg border border-border bg-card p-6 flex items-center justify-center">
          <TrustScore score={compliance.trust_score || 0} />
        </div>

        {/* Summary */}
        <div className="md:col-span-2 rounded-lg border border-border bg-card p-4 flex flex-col justify-center gap-3">
          <p className="text-xs font-medium text-muted-foreground">Check summary</p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="text-2xl font-bold font-mono">{pass}</span>
              <span className="text-xs text-muted-foreground">passed</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-warning" />
              <span className="text-2xl font-bold font-mono">{warn}</span>
              <span className="text-xs text-muted-foreground">warnings</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              <span className="text-2xl font-bold font-mono">{fail}</span>
              <span className="text-xs text-muted-foreground">failed</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Resolve {fail + warn} issue{fail + warn !== 1 ? "s" : ""} to improve your trust score and email deliverability.
          </p>
        </div>
      </div>

      {/* Checklist */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border bg-muted/20">
          <p className="text-xs font-medium">Compliance checks</p>
        </div>
        <div className="divide-y divide-border/50">
          {checks.map((check) => (
            <div key={check.label} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
              {CHECK_ICON[check.status]}
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium", CHECK_TEXT[check.status])}>
                  {check.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{check.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Domain auth status */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border bg-muted/20">
          <p className="text-xs font-medium">Domain authentication status</p>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Domain</th>
              <th className="px-4 py-2 text-center text-[10px] font-medium text-muted-foreground uppercase tracking-wide">DKIM</th>
              <th className="px-4 py-2 text-center text-[10px] font-medium text-muted-foreground uppercase tracking-wide">SPF</th>
              <th className="px-4 py-2 text-center text-[10px] font-medium text-muted-foreground uppercase tracking-wide">DMARC</th>
            </tr>
          </thead>
          <tbody>
            {domains.filter((d) => d.type === "sending").map((d, i) => (
              <tr
                key={d.id}
                className={cn("hover:bg-muted/20 transition-colors", i === 0 && "border-b border-border/50")}
              >
                <td className="px-4 py-2.5 font-mono text-xs">{d.domain}</td>
                {([d.dkim, d.spf, d.dmarc] as boolean[]).map((ok, j) => (
                  <td key={j} className="px-4 py-2.5 text-center">
                    <div className="flex justify-center">
                      {ok
                        ? <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                        : <XCircle      className="h-3.5 w-3.5 text-destructive" />
                      }
                    </div>
                  </td>
                ))}
              </tr>
            ))}
            {domains.filter((d) => d.type === "sending").length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No sending domains configured yet. Add a domain to monitor compliance.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
