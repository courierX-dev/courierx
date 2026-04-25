"use client"

import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { DotIndicator } from "@/components/ui/dot-indicator"
import { PageShell } from "@/components/dashboard/page-shell"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionError } from "@/components/dashboard/inline-error"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useProviderConnections, useRoutingRules, useCreateRoutingRule, useDeleteRoutingRule } from "@/hooks/use-providers"
import { useEmails } from "@/hooks/use-emails"
import { EmailDetailDialog } from "@/components/dashboard/email-detail-dialog"
import { ProviderDetailDialog } from "../providers/provider-detail-dialog"
import { ProviderIcon } from "@/components/ui/provider-icon"
import type { ProviderConnection } from "@/services/providers.service"
import { useVerifyProviderConnection } from "@/hooks/use-providers"

const STRATEGIES = ["failover", "round_robin", "weighted"]

export default function RoutingPage() {
  const { data: connections, isLoading: connLoading, isError: connError, refetch: refetchConn } = useProviderConnections()
  const { data: rules, isLoading: rulesLoading, isError: rulesError, refetch: refetchRules } = useRoutingRules()
  const createRuleMutation = useCreateRoutingRule()
  const deleteRuleMutation = useDeleteRoutingRule()

  const loading = connLoading || rulesLoading
  const isError = connError || rulesError

  const [ruleOpen, setRuleOpen] = useState(false)

  // Rule form state
  const [ruleName, setRuleName]     = useState("")
  const [strategy, setStrategy]     = useState("failover")
  const [matchType, setMatchType]   = useState<"catch_all" | "tag" | "from">("catch_all")
  const [matchTag, setMatchTag]     = useState("")
  const [matchFrom, setMatchFrom]   = useState("")
  const [isDefault, setIsDefault]   = useState(false)
  const [ruleError, setRuleError]   = useState("")

  // Inline delete confirm
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Drill-ins
  const [providerDetail, setProviderDetail] = useState<ProviderConnection | null>(null)
  const [verifyingId, setVerifyingId] = useState<string | null>(null)
  const [openEmailId, setOpenEmailId] = useState<string | null>(null)
  const verifyMutation = useVerifyProviderConnection()
  const { data: failedEmails } = useEmails({ status: "failed", per_page: 10 })
  const { data: bouncedEmails } = useEmails({ status: "bounced", per_page: 10 })

  async function handleVerifyDetail(conn: ProviderConnection) {
    setVerifyingId(conn.id)
    try {
      await verifyMutation.mutateAsync(conn.id)
      toast.success("Re-verified", { description: conn.display_name ?? conn.provider })
    } catch {
      toast.error("Verification failed")
    } finally {
      setVerifyingId(null)
    }
  }

  function resetRuleForm() {
    setRuleName(""); setStrategy("failover"); setMatchType("catch_all")
    setMatchTag(""); setMatchFrom(""); setIsDefault(false); setRuleError("")
  }

  async function handleAddRule(e: React.FormEvent) {
    e.preventDefault()
    setRuleError("")
    try {
      const payload = {
        name: ruleName,
        strategy,
        is_default: isDefault,
        is_active: true,
        ...(matchType === "tag"  ? { match_tag: matchTag }          : {}),
        ...(matchType === "from" ? { match_from_domain: matchFrom } : {}),
      }
      await createRuleMutation.mutateAsync(payload)
      setRuleOpen(false)
      resetRuleForm()
      toast.success("Routing rule created", { description: ruleName })
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { errors?: string[] } } }
      setRuleError(apiErr.response?.data?.errors?.[0] ?? "Failed to create rule.")
    }
  }

  async function handleDeleteRule(id: string, name: string) {
    try {
      await deleteRuleMutation.mutateAsync(id)
      toast.success("Rule deleted", { description: name })
    } catch {
      toast.error("Failed to delete rule")
    } finally {
      setConfirmDeleteId(null)
    }
  }

  // Error state
  if (isError) {
    return (
      <PageShell>
        <PageHeader title="Routing & Failover" subtitle="Provider priority, routing rules, and failover history" />
        <SectionError message="Failed to load routing data" onRetry={() => { refetchConn(); refetchRules() }} />
      </PageShell>
    )
  }

  const connList = connections ?? []
  const rulesList = rules ?? []

  return (
    <PageShell>
      <PageHeader title="Routing & Failover" subtitle="Provider priority, routing rules, and failover history" />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Provider priority */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center justify-between">
            <p className="text-xs font-medium">Provider priority</p>
          </div>
          {loading ? (
            <div className="px-4 py-6 space-y-2" aria-busy="true">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 rounded bg-muted animate-pulse" />
              ))}
            </div>
          ) : connList.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">No providers configured.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Add a provider connection to get started.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {connList.map((p) => {
                const isActive = p.status === "active"
                return (
                <div
                  key={p.id}
                  onClick={() => setProviderDetail(p)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/20",
                    !isActive && "opacity-60",
                  )}
                >
                  <span className="text-xs font-mono text-muted-foreground/60 w-4 text-center">
                    {p.priority}
                  </span>
                  <DotIndicator status={p.status} />
                  <ProviderIcon provider={p.provider} size={16} status={isActive ? "active" : "inactive"} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{p.display_name ?? p.provider}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">
                      {p.avg_latency_ms != null ? `${p.avg_latency_ms}ms avg` : "no latency data"}
                    </p>
                  </div>
                  <span className={cn(
                    "text-xs font-mono font-medium",
                    p.success_rate == null ? "text-muted-foreground"
                      : p.success_rate >= 99 ? "text-success"
                      : p.success_rate >= 97 ? "text-warning"
                      : "text-destructive",
                  )}>
                    {p.success_rate != null ? `${p.success_rate}%` : "—"}
                  </span>
                </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Routing rules */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center justify-between">
            <p className="text-xs font-medium">Routing rules</p>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px] text-muted-foreground gap-1"
              onClick={() => setRuleOpen(true)}
            >
              <Plus className="h-3 w-3" />
              Add rule
            </Button>
          </div>
          {loading ? (
            <div className="px-4 py-6 space-y-2" aria-busy="true">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 rounded bg-muted animate-pulse" />
              ))}
            </div>
          ) : rulesList.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">No routing rules configured.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Rules determine which provider handles each email.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Name</th>
                  <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Match</th>
                  <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Strategy</th>
                  <th className="px-4 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Active</th>
                  <th className="px-4 py-2 w-8" />
                </tr>
              </thead>
              <tbody>
                {rulesList.map((r, i) => (
                  <tr
                    key={r.id}
                    className={cn(
                      "hover:bg-muted/20 transition-colors",
                      i < rulesList.length - 1 && "border-b border-border/50",
                    )}
                  >
                    <td className="px-4 py-2.5 text-sm font-medium">
                      {r.name}
                      {r.is_default && (
                        <span className="ml-2 text-[10px] font-mono text-muted-foreground border border-border rounded px-1">default</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                      {r.match_tag ? `tag: ${r.match_tag}` : r.match_from_domain ? `from: ${r.match_from_domain}` : "catch-all"}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground capitalize">{r.strategy}</td>
                    <td className="px-4 py-2.5 text-right">
                      <DotIndicator status={r.is_active ? "active" : "inactive"} />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {confirmDeleteId === r.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-1.5 text-[11px]"
                            onClick={() => setConfirmDeleteId(null)}
                            disabled={deleteRuleMutation.isPending}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-6 px-1.5 text-[11px]"
                            onClick={() => handleDeleteRule(r.id, r.name)}
                            disabled={deleteRuleMutation.isPending}
                          >
                            Delete
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => setConfirmDeleteId(r.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Recent provider failures (failover-adjacent signal) */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center justify-between">
          <p className="text-xs font-medium">Recent provider failures</p>
          <span className="text-[10px] text-muted-foreground font-mono">
            {(failedEmails?.length ?? 0) + (bouncedEmails?.length ?? 0)} in window
          </span>
        </div>
        {(() => {
          const rows = [...(failedEmails ?? []), ...(bouncedEmails ?? [])]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 10)
          if (rows.length === 0) {
            return (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                No recent provider failures. Routing is healthy.
              </p>
            )
          }
          return (
            <ul className="divide-y divide-border/50">
              {rows.map((e) => (
                <li
                  key={e.id}
                  onClick={() => setOpenEmailId(e.id)}
                  className="px-4 py-2 flex items-center gap-3 text-xs cursor-pointer hover:bg-muted/20"
                >
                  <span className={cn(
                    "h-1.5 w-1.5 rounded-full shrink-0",
                    e.status === "failed" ? "bg-destructive" : "bg-warning",
                  )} />
                  <span className="font-mono text-[11px] text-muted-foreground w-40 shrink-0">
                    {new Date(e.created_at).toLocaleString()}
                  </span>
                  <span className="font-mono w-20 capitalize">{e.status}</span>
                  <span className="font-mono text-muted-foreground truncate">{e.to_email}</span>
                  <span className="text-muted-foreground truncate ml-auto">{e.subject}</span>
                </li>
              ))}
            </ul>
          )
        })()}
      </div>

      {/* Add rule dialog */}
      <Dialog open={ruleOpen} onOpenChange={(v) => { if (!v) { setRuleOpen(false); resetRuleForm() } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add routing rule</DialogTitle>
            <DialogDescription>
              Rules determine which provider handles a given email.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddRule} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="rule-name">Rule name</Label>
              <Input
                id="rule-name"
                placeholder="Transactional fallback"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rule-strategy">Strategy</Label>
              <select
                id="rule-strategy"
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {STRATEGIES.map((s) => (
                  <option key={s} value={s}>{s.replace("_", " ")}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rule-match">Match condition</Label>
              <select
                id="rule-match"
                value={matchType}
                onChange={(e) => setMatchType(e.target.value as typeof matchType)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="catch_all">Catch-all (all emails)</option>
                <option value="tag">By tag</option>
                <option value="from">By from domain</option>
              </select>
            </div>

            {matchType === "tag" && (
              <div className="space-y-1.5">
                <Label htmlFor="rule-tag">Tag</Label>
                <Input
                  id="rule-tag"
                  placeholder="transactional"
                  value={matchTag}
                  onChange={(e) => setMatchTag(e.target.value)}
                  required
                />
              </div>
            )}

            {matchType === "from" && (
              <div className="space-y-1.5">
                <Label htmlFor="rule-from">From domain</Label>
                <Input
                  id="rule-from"
                  placeholder="example.com"
                  value={matchFrom}
                  onChange={(e) => setMatchFrom(e.target.value)}
                  required
                />
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              <span className="text-sm">Set as default rule</span>
            </label>

            {ruleError && <p className="text-xs text-destructive">{ruleError}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => { setRuleOpen(false); resetRuleForm() }}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createRuleMutation.isPending}>
                {createRuleMutation.isPending ? "Creating…" : "Create rule"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ProviderDetailDialog
        conn={providerDetail}
        onOpenChange={(o) => !o && setProviderDetail(null)}
        onVerify={() => providerDetail && handleVerifyDetail(providerDetail)}
        isVerifying={!!providerDetail && verifyingId === providerDetail.id}
      />

      <EmailDetailDialog
        emailId={openEmailId}
        onOpenChange={(o) => !o && setOpenEmailId(null)}
      />
    </PageShell>
  )
}
