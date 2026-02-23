import { CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { TrustScore } from "@/components/ui/trust-score"
import { cn } from "@/lib/utils"
import { PROJECT, DOMAINS } from "@/lib/mock-data"

type CheckStatus = "pass" | "fail" | "warn"

const CHECKS: { label: string; description: string; status: CheckStatus }[] = [
  {
    label:       "DKIM configured",
    description: "At least one sending domain has DKIM records published.",
    status:      "pass",
  },
  {
    label:       "SPF record present",
    description: "Your sending domain has a valid SPF TXT record.",
    status:      "pass",
  },
  {
    label:       "DMARC policy",
    description: "DMARC is partially configured. Set policy to quarantine or reject.",
    status:      "warn",
  },
  {
    label:       "Tracking domain",
    description: "Custom tracking domain verified for open/click tracking.",
    status:      "fail",
  },
  {
    label:       "Bounce processing",
    description: "Bounced emails are automatically suppressed.",
    status:      "pass",
  },
  {
    label:       "Unsubscribe header",
    description: "List-Unsubscribe headers are added to outbound messages.",
    status:      "pass",
  },
  {
    label:       "Complaint handling",
    description: "Spam complaints trigger automatic suppression.",
    status:      "pass",
  },
]

const CHECK_ICON: Record<CheckStatus, React.ReactNode> = {
  pass: <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />,
  fail: <XCircle      className="h-4 w-4 text-destructive flex-shrink-0" />,
  warn: <AlertCircle  className="h-4 w-4 text-warning flex-shrink-0"    />,
}

const CHECK_TEXT: Record<CheckStatus, string> = {
  pass: "text-foreground",
  fail: "text-destructive",
  warn: "text-warning",
}

const pass = CHECKS.filter((c) => c.status === "pass").length
const fail = CHECKS.filter((c) => c.status === "fail").length
const warn = CHECKS.filter((c) => c.status === "warn").length

export default function CompliancePage() {
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
          <TrustScore score={PROJECT.trust_score} />
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
          {CHECKS.map((check) => (
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
            {DOMAINS.filter((d) => d.type === "sending").map((d, i) => (
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
          </tbody>
        </table>
      </div>
    </div>
  )
}
