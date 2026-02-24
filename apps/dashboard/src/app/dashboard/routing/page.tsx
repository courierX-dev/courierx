"use client"

import { useEffect, useState } from "react"
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
import { cn } from "@/lib/utils"
import { providersService, type ProviderConnection, type RoutingRule } from "@/services/providers.service"
import { toast } from "sonner"

const STRATEGIES = ["failover", "round_robin", "weighted"]

export default function RoutingPage() {
  const [connections, setConnections] = useState<ProviderConnection[]>([])
  const [rules, setRules]             = useState<RoutingRule[]>([])
  const [loading, setLoading]         = useState(true)
  const [ruleOpen, setRuleOpen]       = useState(false)

  // Rule form state
  const [ruleName, setRuleName]     = useState("")
  const [strategy, setStrategy]     = useState("failover")
  const [matchType, setMatchType]   = useState<"catch_all" | "tag" | "from">("catch_all")
  const [matchTag, setMatchTag]     = useState("")
  const [matchFrom, setMatchFrom]   = useState("")
  const [isDefault, setIsDefault]   = useState(false)
  const [savingRule, setSavingRule] = useState(false)
  const [ruleError, setRuleError]   = useState("")

  // Inline delete confirm
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingRule, setDeletingRule]       = useState(false)

  useEffect(() => {
    Promise.all([
      providersService.listConnections(),
      providersService.listRules(),
    ])
      .then(([c, r]) => { setConnections(c); setRules(r) })
      .catch(() => toast.error("Failed to load routing data"))
      .finally(() => setLoading(false))
  }, [])

  function resetRuleForm() {
    setRuleName(""); setStrategy("failover"); setMatchType("catch_all")
    setMatchTag(""); setMatchFrom(""); setIsDefault(false); setRuleError("")
  }

  async function handleAddRule(e: React.FormEvent) {
    e.preventDefault()
    setSavingRule(true)
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
      const created = await providersService.createRule(payload)
      setRules((prev) => [created, ...prev])
      setRuleOpen(false)
      resetRuleForm()
      toast.success("Routing rule created", { description: ruleName })
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { errors?: string[] } } }
      setRuleError(apiErr.response?.data?.errors?.[0] ?? "Failed to create rule.")
    } finally {
      setSavingRule(false)
    }
  }

  async function handleDeleteRule(id: string, name: string) {
    setDeletingRule(true)
    try {
      await providersService.deleteRule(id)
      setRules((prev) => prev.filter((r) => r.id !== id))
      toast.success("Rule deleted", { description: name })
    } catch {
      toast.error("Failed to delete rule")
    } finally {
      setDeletingRule(false)
      setConfirmDeleteId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-base font-semibold tracking-tight">Routing & Failover</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Provider priority, routing rules, and failover history
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Provider priority */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center justify-between">
            <p className="text-xs font-medium">Provider priority</p>
          </div>
          {loading ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground animate-pulse">Loading…</p>
          ) : connections.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">No providers configured.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Add a provider connection to get started.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {connections.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xs font-mono text-muted-foreground/60 w-4 text-center">
                    {p.priority}
                  </span>
                  <DotIndicator status={p.status} />
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
              ))}
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
            <p className="px-4 py-6 text-center text-sm text-muted-foreground animate-pulse">Loading…</p>
          ) : rules.length === 0 ? (
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
                {rules.map((r, i) => (
                  <tr
                    key={r.id}
                    className={cn(
                      "hover:bg-muted/20 transition-colors",
                      i < rules.length - 1 && "border-b border-border/50",
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
                            disabled={deletingRule}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-6 px-1.5 text-[11px]"
                            onClick={() => handleDeleteRule(r.id, r.name)}
                            disabled={deletingRule}
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

      {/* Failover history */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border bg-muted/20">
          <p className="text-xs font-medium">Failover history</p>
        </div>
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
          No failover events recorded.
        </p>
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
              <Button type="submit" size="sm" disabled={savingRule}>
                {savingRule ? "Creating…" : "Create rule"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
