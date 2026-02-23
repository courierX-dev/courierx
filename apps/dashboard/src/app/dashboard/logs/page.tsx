"use client"

import { useState, useMemo } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { LOGS } from "@/lib/mock-data"

const ALL_STATUSES = ["all", "delivered", "opened", "clicked", "bounced", "failed", "queued"]
const ALL_PROVIDERS = ["all", "SES", "SendGrid", "Mailgun"]

const STATUS_COLOR: Record<string, string> = {
  delivered: "text-success",
  opened:    "text-sky-500 dark:text-sky-400",
  clicked:   "text-violet-500 dark:text-violet-400",
  bounced:   "text-destructive",
  failed:    "text-destructive",
  queued:    "text-muted-foreground",
  sent:      "text-primary",
}

export default function LogsPage() {
  const [search, setSearch]     = useState("")
  const [status, setStatus]     = useState("all")
  const [provider, setProvider] = useState("all")

  const filtered = useMemo(() => {
    return LOGS.filter((log) => {
      const matchSearch =
        !search ||
        log.to.toLowerCase().includes(search.toLowerCase()) ||
        log.subject.toLowerCase().includes(search.toLowerCase()) ||
        log.id.toLowerCase().includes(search.toLowerCase())
      const matchStatus   = status === "all"   || log.status === status
      const matchProvider = provider === "all" || log.provider === provider
      return matchSearch && matchStatus && matchProvider
    })
  }, [search, status, provider])

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <h1 className="text-base font-semibold tracking-tight">Message Logs</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">Real-time delivery log</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-8 h-8 text-sm w-64"
            placeholder="Search recipient, subject, ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{s === "all" ? "All statuses" : s}</option>
          ))}
        </select>

        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {ALL_PROVIDERS.map((p) => (
            <option key={p} value={p}>{p === "all" ? "All providers" : p}</option>
          ))}
        </select>

        <span className="ml-auto text-xs text-muted-foreground font-mono">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">Timestamp</th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Message ID</th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Recipient</th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">Subject</th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Status</th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Provider</th>
              <th className="px-4 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">ms</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No messages match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((log, i) => (
                <tr
                  key={log.id}
                  className={cn(
                    "hover:bg-muted/20 transition-colors cursor-default",
                    i < filtered.length - 1 && "border-b border-border/50",
                  )}
                >
                  <td className="px-4 py-2 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                    {log.ts}
                  </td>
                  <td className="px-4 py-2 font-mono text-[11px] text-muted-foreground">
                    {log.id}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs max-w-[160px] truncate">
                    {log.to}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground max-w-[200px] truncate hidden md:table-cell">
                    {log.subject}
                  </td>
                  <td className="px-4 py-2">
                    <span className={cn("text-xs font-medium capitalize", STATUS_COLOR[log.status] ?? "text-muted-foreground")}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground hidden lg:table-cell">
                    {log.provider}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs text-muted-foreground hidden lg:table-cell">
                    {log.ms > 0 ? log.ms : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
