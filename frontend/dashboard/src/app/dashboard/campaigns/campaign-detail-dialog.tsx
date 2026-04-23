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
import type { CampaignGroup } from "./types"

interface Props {
  campaign: CampaignGroup | null
  onOpenChange: (open: boolean) => void
}

export function CampaignDetailDialog({ campaign, onOpenChange }: Props) {
  const [tab, setTab] = useState<"preview" | "html" | "text">("preview")
  const { data: email, isLoading, isError } = useEmail(campaign?.sampleEmailId ?? "")

  if (!campaign) return null

  const html = email?.html_body ?? ""
  const text = email?.text_body ?? ""
  const hasHtml = html.trim().length > 0
  const hasText = text.trim().length > 0

  return (
    <Dialog open={!!campaign} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate">{campaign.subject}</DialogTitle>
          <DialogDescription className="font-mono text-[11px]">
            From {campaign.fromEmail} · {campaign.totalSent.toLocaleString()} sent ·{" "}
            {campaign.delivered.toLocaleString()} delivered ·{" "}
            {campaign.bounced.toLocaleString()} bounced
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-1 border-b border-border">
          {(["preview", "html", "text"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors",
                tab === t
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "preview" ? "Preview" : t === "html" ? "HTML" : "Text"}
            </button>
          ))}
          <span className="ml-auto text-[10px] font-mono text-muted-foreground pr-1">
            sample · {campaign.sampleEmailId.slice(0, 8)}
          </span>
        </div>

        <div className="flex-1 overflow-auto rounded-md border border-border bg-muted/10">
          {isLoading ? (
            <div className="p-6 space-y-2" aria-busy="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-3 rounded bg-muted animate-pulse" />
              ))}
            </div>
          ) : isError ? (
            <p className="p-6 text-sm text-destructive">Could not load email content.</p>
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
              <p className="p-6 text-sm text-muted-foreground">No content for this email.</p>
            )
          ) : tab === "html" ? (
            hasHtml ? (
              <pre className="p-4 text-[11px] whitespace-pre-wrap font-mono break-all">{html}</pre>
            ) : (
              <p className="p-6 text-sm text-muted-foreground">No HTML body.</p>
            )
          ) : hasText ? (
            <pre className="p-4 text-[11px] whitespace-pre-wrap font-mono">{text}</pre>
          ) : (
            <p className="p-6 text-sm text-muted-foreground">No plain-text body.</p>
          )}
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
            Recipients ({campaign.totalSent.toLocaleString()})
          </p>
          <div className="flex flex-wrap gap-1">
            {campaign.recipients.map((r) => (
              <span
                key={r}
                className="inline-flex items-center rounded border border-border px-1.5 py-0.5 text-[11px] font-mono text-muted-foreground"
              >
                {r}
              </span>
            ))}
            {campaign.totalSent > campaign.recipients.length && (
              <span className="text-[11px] text-muted-foreground">
                +{campaign.totalSent - campaign.recipients.length} more
              </span>
            )}
          </div>
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
