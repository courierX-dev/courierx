import { Plus, CheckCircle2, XCircle, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DotIndicator } from "@/components/ui/dot-indicator"
import { cn } from "@/lib/utils"
import { DOMAINS } from "@/lib/mock-data"

function DnsCheck({ ok }: { ok: boolean }) {
  return ok ? (
    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
  ) : (
    <XCircle className="h-3.5 w-3.5 text-muted-foreground/40" />
  )
}

export default function DomainsPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Domains</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Manage sending and tracking domains
          </p>
        </div>
        <Button size="sm" className="h-8 gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add domain
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Domain</th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Type</th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Status</th>
              <th className="px-4 py-2 text-center text-[10px] font-medium text-muted-foreground uppercase tracking-wide">DKIM</th>
              <th className="px-4 py-2 text-center text-[10px] font-medium text-muted-foreground uppercase tracking-wide">SPF</th>
              <th className="px-4 py-2 text-center text-[10px] font-medium text-muted-foreground uppercase tracking-wide">DMARC</th>
              <th className="px-4 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {DOMAINS.map((d, i) => (
              <tr
                key={d.id}
                className={cn(
                  "hover:bg-muted/20 transition-colors",
                  i < DOMAINS.length - 1 && "border-b border-border/50",
                )}
              >
                <td className="px-4 py-3 font-mono text-sm">{d.domain}</td>
                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground capitalize">{d.type}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <DotIndicator status={d.status} />
                    <span className="text-xs capitalize">{d.status}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex justify-center">
                    <DnsCheck ok={d.dkim} />
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex justify-center">
                    <DnsCheck ok={d.spf} />
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex justify-center">
                    <DnsCheck ok={d.dmarc} />
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground gap-1">
                    <ExternalLink className="h-3 w-3" />
                    DNS records
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Info callout */}
      <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Authentication setup</p>
        <p>
          Add the DNS records below to your domain registrar to verify your sending domains.
          DKIM and SPF are required; DMARC is strongly recommended to improve deliverability.
        </p>
      </div>
    </div>
  )
}
