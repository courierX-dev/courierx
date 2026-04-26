"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useEmail } from "@/hooks/use-emails"
import { ProviderIcon } from "@/components/ui/provider-icon"

const STATUS_COLOR: Record<string, string> = {
  delivered:  "text-success",
  opened:     "text-sky-500 dark:text-sky-400",
  clicked:    "text-violet-500 dark:text-violet-400",
  bounced:    "text-amber-500 dark:text-amber-400",
  failed:     "text-destructive",
  complained: "text-destructive",
  suppressed: "text-muted-foreground",
  queued:     "text-muted-foreground",
  sent:       "text-sky-500 dark:text-sky-400",
}

// Tone for the "Why?" panel border/background, keyed on raw status.
// Bounced -> amber, failed/complained -> red, everything else -> neutral.
const PANEL_TONE: Record<string, { container: string; heading: string }> = {
  bounced:    { container: "border-amber-500/40 bg-amber-500/5",      heading: "text-amber-600 dark:text-amber-400" },
  failed:     { container: "border-destructive/40 bg-destructive/5",  heading: "text-destructive" },
  complained: { container: "border-destructive/40 bg-destructive/5",  heading: "text-destructive" },
}

function panelHeading(status: string): string {
  if (status === "failed" || status === "bounced" || status === "complained") return "Why this failed"
  return "Status"
}

interface Props {
  emailId: string | null
  onOpenChange: (open: boolean) => void
}

export function EmailDetailDialog({ emailId, onOpenChange }: Props) {
  const [tab, setTab] = useState<"preview" | "html" | "text" | "events">("preview")
  const { data: email, isLoading, isError } = useEmail(emailId ?? "")

  const open = !!emailId
  const html = email?.html_body ?? ""
  const text = email?.text_body ?? ""
  const hasHtml = html.trim().length > 0
  const hasText = text.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate">
            {email?.subject ?? (isLoading ? "Loading…" : "Message")}
          </DialogTitle>
          <DialogDescription className="font-mono text-[11px] flex flex-wrap gap-x-3 gap-y-1">
            {email && (
              <>
                <span>From {email.from_email}</span>
                <span>To {email.to_email}</span>
                <span className={cn(STATUS_COLOR[email.status])}>{email.display_status ?? email.status}</span>
                <span>{new Date(email.created_at).toLocaleString()}</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {email?.display_message && (() => {
          const tone = PANEL_TONE[email.status] ?? { container: "border-border bg-muted/30", heading: "text-foreground" }
          const cta  = email.display_cta
          return (
            <div className={cn("rounded-md border px-3 py-2.5 space-y-2", tone.container)}>
              <h4 className={cn("text-xs font-semibold uppercase tracking-wide", tone.heading)}>
                {panelHeading(email.status)}
              </h4>
              <p className="text-sm text-foreground">{email.display_message}</p>
              {cta && (
                cta.url ? (
                  <a
                    href={cta.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex"
                  >
                    <Button size="sm" variant="outline">{cta.label}</Button>
                  </a>
                ) : cta.action ? (
                  <Button
                    size="sm"
                    variant="outline"
                    // TODO: wire CTA action handler (see backend display_cta.action contract)
                    onClick={() => console.log("action:", cta.action, cta.args)}
                  >
                    {cta.label}
                  </Button>
                ) : null
              )}
              {email.last_error && (
                <details className="group">
                  <summary className="text-[11px] text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors">
                    Technical detail
                  </summary>
                  <pre className="mt-2 p-2 rounded bg-muted/40 text-[11px] font-mono whitespace-pre-wrap break-all text-muted-foreground">
                    {email.last_error}
                  </pre>
                </details>
              )}
            </div>
          )
        })()}

        <div className="flex items-center gap-1 border-b border-border">
          {(["preview", "html", "text", "events"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors capitalize",
                tab === t
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t}
              {t === "events" && email?.events?.length ? ` (${email.events.length})` : ""}
            </button>
          ))}
          {email && (
            <span className="ml-auto text-[10px] font-mono text-muted-foreground pr-1">
              {email.id.slice(0, 8)}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-auto rounded-md border border-border bg-muted/10">
          {isLoading ? (
            <div className="p-6 space-y-2" aria-busy="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-3 rounded bg-muted animate-pulse" />
              ))}
            </div>
          ) : isError || !email ? (
            <p className="p-6 text-sm text-destructive">Could not load message.</p>
          ) : tab === "preview" ? (
            hasHtml ? (
              <iframe
                title="Email preview"
                srcDoc={html}
                sandbox=""
                className="w-full h-[55vh] bg-white"
              />
            ) : hasText ? (
              <pre className="p-4 text-xs whitespace-pre-wrap font-mono">{text}</pre>
            ) : (
              <p className="p-6 text-sm text-muted-foreground">No content for this message.</p>
            )
          ) : tab === "html" ? (
            hasHtml ? (
              <pre className="p-4 text-[11px] whitespace-pre-wrap font-mono break-all">{html}</pre>
            ) : (
              <p className="p-6 text-sm text-muted-foreground">No HTML body.</p>
            )
          ) : tab === "text" ? (
            hasText ? (
              <pre className="p-4 text-[11px] whitespace-pre-wrap font-mono">{text}</pre>
            ) : (
              <p className="p-6 text-sm text-muted-foreground">No plain-text body.</p>
            )
          ) : email.events.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No events recorded yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {email.events.map((ev) => (
                <li key={ev.id} className="px-4 py-2 flex items-center gap-3 text-xs">
                  <span className="font-mono text-[11px] text-muted-foreground w-40 shrink-0">
                    {new Date(ev.occurred_at).toLocaleString()}
                  </span>
                  <span className={cn("font-medium capitalize w-24", STATUS_COLOR[ev.event_type] ?? "")}>
                    {ev.event_type}
                  </span>
                  {ev.provider && (
                    <ProviderIcon provider={ev.provider} size={12} />
                  )}
                  <span className="text-muted-foreground font-mono text-[11px] truncate">
                    {ev.provider}
                    {ev.bounce_code ? ` · ${ev.bounce_code}` : ""}
                    {ev.bounce_type ? ` · ${ev.bounce_type}` : ""}
                    {ev.link_url ? ` · ${ev.link_url}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end">
          <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
