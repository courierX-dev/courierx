"use client"

import { useState } from "react"
import { Plus, Copy, Trash2, Eye } from "lucide-react"
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
import { API_KEYS } from "@/lib/mock-data"

type Step = "form" | "created"

const FAKE_FULL_KEY = "sk_prod_4f2a9c1e8b3d7f6a2e5c0b9d4f8e1a3c7b2d5f9e0a6c4b8e3f1d7a9c2b5f0e8d"

export default function ApiKeysPage() {
  const [open, setOpen]       = useState(false)
  const [step, setStep]       = useState<Step>("form")
  const [keyName, setKeyName] = useState("")
  const [copied, setCopied]   = useState(false)

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setStep("created")
  }

  function handleClose() {
    setOpen(false)
    setTimeout(() => { setStep("form"); setKeyName(""); setCopied(false) }, 300)
  }

  function handleCopy() {
    navigator.clipboard.writeText(FAKE_FULL_KEY)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold tracking-tight">API Keys</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Authenticate requests to the CourierX API
          </p>
        </div>
        <Button size="sm" className="h-8 gap-1.5" onClick={() => setOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Create key
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Name</th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Key</th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">Scopes</th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Created</th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Last used</th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {API_KEYS.map((k, i) => (
              <tr
                key={k.id}
                className={cn(
                  "hover:bg-muted/20 transition-colors",
                  k.status === "revoked" && "opacity-50",
                  i < API_KEYS.length - 1 && "border-b border-border/50",
                )}
              >
                <td className="px-4 py-2.5 text-sm font-medium">{k.name}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                  {k.prefix}···
                </td>
                <td className="px-4 py-2.5 hidden md:table-cell">
                  <div className="flex gap-1 flex-wrap">
                    {k.scopes.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center rounded border border-border px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground hidden lg:table-cell">
                  {k.created_at}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground hidden lg:table-cell">
                  {k.last_used}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <DotIndicator status={k.status} />
                    <span className="text-xs capitalize">{k.status}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right">
                  {k.status !== "revoked" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
        <DialogContent className="sm:max-w-md">
          {step === "form" ? (
            <>
              <DialogHeader>
                <DialogTitle>Create API key</DialogTitle>
                <DialogDescription>
                  Give your key a descriptive name so you can identify it later.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="key-name">Key name</Label>
                  <Input
                    id="key-name"
                    placeholder="e.g. Production API"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm">Create key</Button>
                </div>
              </form>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Save your API key</DialogTitle>
                <DialogDescription>
                  This is the only time the full key will be shown. Copy it now.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-2 space-y-4">
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2.5">
                  <code className="flex-1 font-mono text-xs text-foreground break-all select-all">
                    {FAKE_FULL_KEY}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 shrink-0"
                    onClick={handleCopy}
                  >
                    {copied ? <Eye className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-warning" />
                  Store this securely — it won&apos;t be shown again.
                </p>
                <div className="flex justify-end">
                  <Button size="sm" onClick={handleClose}>Done</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
