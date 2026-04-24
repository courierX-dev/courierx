"use client"

import { useState, useMemo } from "react"
import { Search, ChevronLeft, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { PageShell } from "@/components/dashboard/page-shell"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionError } from "@/components/dashboard/inline-error"
import { cn } from "@/lib/utils"
import { useEmails } from "@/hooks/use-emails"
import { EmailDetailDialog } from "@/components/dashboard/email-detail-dialog"

const ALL_STATUSES = ["all", "queued", "sent", "delivered", "bounced", "complained", "failed", "suppressed"]

const STATUS_COLOR: Record<string, string> = {
  delivered:  "text-success",
  opened:     "text-sky-500 dark:text-sky-400",
  clicked:    "text-violet-500 dark:text-violet-400",
  bounced:    "text-destructive",
  failed:     "text-destructive",
  complained: "text-destructive",
  suppressed: "text-muted-foreground",
  queued:     "text-muted-foreground",
  sent:       "text-primary",
}

const PER_PAGE = 25

export default function LogsPage() {
  const [search, setSearch]   = useState("")
  const [status, setStatus]   = useState("all")
  const [page, setPage]       = useState(1)
  const [openId, setOpenId]   = useState<string | null>(null)

  // Debounced search: useEmails re-fetches whenever queryKey changes
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  function handleSearchChange(value: string) {
    setSearch(value)
    if (debounceTimer) clearTimeout(debounceTimer)
    setDebounceTimer(setTimeout(() => {
      setDebouncedSearch(value)
      setPage(1)
    }, 400))
  }

  function handleStatusChange(value: string) {
    setStatus(value)
    setPage(1)
  }

  const { data: emails, isLoading, isFetching, isError, refetch } = useEmails({
    page,
    per_page: PER_PAGE,
    status: status !== "all" ? status : undefined,
    recipient: debouncedSearch || undefined,
  })

  // Client-side subject / ID search on the current page
  const filtered = useMemo(() => {
    if (!emails) return []
    if (!search) return emails
    const q = search.toLowerCase()
    return emails.filter((e) =>
      e.to_email.toLowerCase().includes(q) ||
      e.subject.toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q),
    )
  }, [emails, search])

  // Error state
  if (isError) {
    return (
      <PageShell gap="sm">
        <PageHeader title="Message Logs" subtitle="Real-time delivery log" />
        <SectionError message="Failed to load logs" onRetry={refetch} />
      </PageShell>
    )
  }

  return (
    <PageShell gap="sm">
      <PageHeader title="Message Logs" subtitle="Real-time delivery log" />

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-8 h-8 text-sm w-64"
            placeholder="Search recipient, subject, ID…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{s === "all" ? "All statuses" : s}</option>
          ))}
        </select>

        <span className="ml-auto text-xs text-muted-foreground font-mono">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className={cn("rounded-lg border border-border overflow-hidden transition-opacity", isFetching && !isLoading && "opacity-60")}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">Timestamp</th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Message ID</th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Recipient</th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">Subject</th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6" aria-busy="true">
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-8 rounded bg-muted animate-pulse" />
                    ))}
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {search || status !== "all" ? "No messages match your filters." : "No logs yet. Email delivery logs will appear here once you start sending."}
                </td>
              </tr>
            ) : (
              filtered.map((email, i) => (
                <tr
                  key={email.id}
                  onClick={() => setOpenId(email.id)}
                  className={cn(
                    "hover:bg-muted/20 transition-colors cursor-pointer",
                    i < filtered.length - 1 && "border-b border-border/50",
                  )}
                >
                  <td className="px-4 py-2 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                    {new Date(email.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 font-mono text-[11px] text-muted-foreground truncate max-w-25">
                    {email.id.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-2 font-mono text-xs max-w-40 truncate">
                    {email.to_email}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground max-w-50 truncate hidden md:table-cell">
                    {email.subject}
                  </td>
                  <td className="px-4 py-2">
                    <span className={cn("text-xs font-medium capitalize", STATUS_COLOR[email.status] ?? "text-muted-foreground")}>
                      {email.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Page {page}</span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || isFetching}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setPage((p) => p + 1)}
            disabled={(emails?.length ?? 0) < PER_PAGE || isFetching}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <EmailDetailDialog
        emailId={openId}
        onOpenChange={(open) => !open && setOpenId(null)}
      />
    </PageShell>
  )
}
