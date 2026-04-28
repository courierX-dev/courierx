"use client"

import { useState } from "react"
import { Plus, Copy, Trash2, Check, AlertTriangle, Bot, ExternalLink } from "lucide-react"
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { DotIndicator } from "@/components/ui/dot-indicator"
import { PageShell } from "@/components/dashboard/page-shell"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionError } from "@/components/dashboard/inline-error"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  useMcpConnections,
  useCreateMcpConnection,
  useDeleteMcpConnection,
} from "@/hooks/use-mcp"
import {
  MCP_PERMISSIONS,
  type McpConnection,
  type CreatedMcpConnection,
  type McpPermission,
} from "@/services/mcp.service"

type CreateStep = "form" | "created"

const DEFAULT_PERMS: McpPermission[] = ["read_only", "send_email"]

export default function McpPage() {
  const { data: connections, isLoading, isError, refetch } = useMcpConnections()
  const createMutation = useCreateMcpConnection()
  const deleteMutation = useDeleteMcpConnection()

  const [createOpen, setCreateOpen] = useState(false)
  const [createStep, setCreateStep] = useState<CreateStep>("form")
  const [name, setName]             = useState("")
  const [description, setDescription] = useState("")
  const [perms, setPerms]           = useState<McpPermission[]>(DEFAULT_PERMS)
  const [created, setCreated]       = useState<CreatedMcpConnection | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<McpConnection | null>(null)
  const [installFor, setInstallFor]     = useState<McpConnection | null>(null)

  function togglePerm(p: McpPermission) {
    setPerms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || perms.length === 0) {
      toast.error("Name and at least one permission are required")
      return
    }
    try {
      const conn = await createMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        permissions: perms,
      })
      setCreated(conn)
      setCreateStep("created")
    } catch {
      toast.error("Failed to create connection")
    }
  }

  function closeCreate() {
    setCreateOpen(false)
    setTimeout(() => {
      setCreateStep("form")
      setName("")
      setDescription("")
      setPerms(DEFAULT_PERMS)
      setCreated(null)
      setCopiedField(null)
    }, 250)
  }

  async function copyValue(value: string, field: string) {
    await navigator.clipboard.writeText(value)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 1500)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      toast.success("Connection deleted")
      setDeleteTarget(null)
    } catch {
      toast.error("Failed to delete connection")
    }
  }

  if (isError) {
    return (
      <PageShell>
        <PageHeader title="MCP" subtitle="Let AI agents send email through CourierX" />
        <SectionError message="Failed to load MCP connections" onRetry={refetch} />
      </PageShell>
    )
  }

  const list = connections ?? []

  return (
    <PageShell>
      <PageHeader
        title="MCP"
        subtitle="Let AI agents send email and manage your account through the Model Context Protocol"
      >
        <Button size="sm" className="h-8 gap-1.5" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          New connection
        </Button>
      </PageHeader>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Name</th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Client ID</th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">Permissions</th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Sent</th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Last used</th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-6" aria-busy="true">
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-10 rounded bg-muted animate-pulse" />
                    ))}
                  </div>
                </td>
              </tr>
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12">
                  <div className="flex flex-col items-center justify-center text-center">
                    <Bot className="mb-3 h-8 w-8 text-muted-foreground/60" />
                    <h3 className="text-sm font-medium">No MCP connections</h3>
                    <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                      Connect Claude, Cursor, or any MCP-compatible agent to send email and manage your account through CourierX.
                    </p>
                    <Button size="sm" className="mt-4 h-8" onClick={() => setCreateOpen(true)}>
                      Create connection
                    </Button>
                  </div>
                </td>
              </tr>
            ) : (
              list.map((c, i) => (
                <tr
                  key={c.id}
                  className={cn("hover:bg-muted/20 transition-colors", i < list.length - 1 && "border-b border-border/50")}
                >
                  <td className="px-4 py-2.5 text-sm font-medium">
                    {c.name}
                    {c.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                    {c.client_id.slice(0, 12)}…
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {c.permissions.map((p) => (
                        <span
                          key={p}
                          className="inline-flex items-center rounded border border-border px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground hidden lg:table-cell">
                    {c.total_emails_sent}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground hidden lg:table-cell">
                    {c.last_used_at ? new Date(c.last_used_at).toLocaleDateString() : "Never"}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <DotIndicator status={c.status === "connected" ? "active" : "inactive"} />
                      <span className="text-xs capitalize">{c.status}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs gap-1"
                        onClick={() => setInstallFor(c)}
                      >
                        <ExternalLink className="h-3 w-3" />
                        Connect
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(c)}
                        aria-label="Delete connection"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={(v) => { if (!v) closeCreate() }}>
        <DialogContent className="sm:max-w-lg">
          {createStep === "form" ? (
            <>
              <DialogHeader>
                <DialogTitle>New MCP connection</DialogTitle>
                <DialogDescription>
                  Each connection gets its own credentials and scoped permissions. Use one per agent or workspace.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="mcp-name">Name *</Label>
                  <Input
                    id="mcp-name"
                    placeholder="e.g. Claude Desktop"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mcp-desc">Description</Label>
                  <Input
                    id="mcp-desc"
                    placeholder="What will this agent do?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Permissions *</Label>
                  <div className="space-y-1.5 rounded-md border border-border p-3">
                    {MCP_PERMISSIONS.map((p) => (
                      <label
                        key={p.value}
                        className="flex items-start gap-2.5 cursor-pointer text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={perms.includes(p.value)}
                          onChange={() => togglePerm(p.value)}
                          className="mt-0.5 h-3.5 w-3.5 cursor-pointer accent-primary"
                        />
                        <div>
                          <div className="text-sm font-medium">{p.label}</div>
                          <div className="text-xs text-muted-foreground">{p.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={closeCreate}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating…" : "Create connection"}
                  </Button>
                </div>
              </form>
            </>
          ) : created ? (
            <CreatedReveal
              created={created}
              copiedField={copiedField}
              onCopy={copyValue}
              onClose={closeCreate}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Install snippet dialog */}
      <Dialog open={!!installFor} onOpenChange={(v) => { if (!v) setInstallFor(null) }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Connect an agent</DialogTitle>
            <DialogDescription>
              Drop these snippets into your agent. The client secret is shown only at creation time — if you&apos;ve lost it, create a new connection.
            </DialogDescription>
          </DialogHeader>
          {installFor && <InstallSnippets connection={installFor} onCopy={copyValue} copiedField={copiedField} />}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Delete MCP connection
            </DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="rounded-md border border-destructive/20 bg-destructive/4 px-4 py-3">
              <p className="text-sm font-medium">{deleteTarget?.name}</p>
              <p className="font-mono text-xs text-muted-foreground mt-0.5">{deleteTarget?.client_id}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              The agent using this connection will lose access immediately. Audit log entries are retained.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending}>
                Cancel
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}

function CreatedReveal({
  created,
  copiedField,
  onCopy,
  onClose,
}: {
  created: CreatedMcpConnection
  copiedField: string | null
  onCopy: (v: string, f: string) => void
  onClose: () => void
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Save your credentials</DialogTitle>
        <DialogDescription>
          The client secret is shown only once. Copy both values and configure your agent now.
        </DialogDescription>
      </DialogHeader>
      <div className="mt-2 space-y-3">
        <SecretRow label="Client ID" value={created.client_id} field="cid" copiedField={copiedField} onCopy={onCopy} />
        <SecretRow label="Client secret" value={created.client_secret} field="csec" copiedField={copiedField} onCopy={onCopy} />
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-warning" />
          The client secret will not be shown again.
        </p>
        <div className="flex justify-end">
          <Button size="sm" onClick={onClose}>Done</Button>
        </div>
      </div>
    </>
  )
}

function SecretRow({
  label,
  value,
  field,
  copiedField,
  onCopy,
}: {
  label: string
  value: string
  field: string
  copiedField: string | null
  onCopy: (v: string, f: string) => void
}) {
  const isCopied = copiedField === field
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1 flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2.5">
        <code className="flex-1 font-mono text-xs text-foreground break-all select-all">{value}</code>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => onCopy(value, field)} aria-label={`Copy ${label}`}>
          {isCopied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  )
}

function InstallSnippets({
  connection,
  onCopy,
  copiedField,
}: {
  connection: McpConnection
  onCopy: (v: string, f: string) => void
  copiedField: string | null
}) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
  const endpoint = `${apiBase}/api/v1/mcp`

  const claudeJson = `{
  "mcpServers": {
    "courierx": {
      "transport": "http",
      "url": "${endpoint}",
      "headers": {
        "Authorization": "Bearer ${connection.client_id}:<CLIENT_SECRET>"
      }
    }
  }
}`

  const cursorJson = `{
  "mcp": {
    "servers": {
      "courierx": {
        "url": "${endpoint}",
        "headers": {
          "Authorization": "Bearer ${connection.client_id}:<CLIENT_SECRET>"
        }
      }
    }
  }
}`

  const curlSnippet = `curl -X POST ${endpoint} \\
  -H "Authorization: Bearer ${connection.client_id}:<CLIENT_SECRET>" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`

  return (
    <Tabs defaultValue="claude" className="mt-2">
      <TabsList className="grid grid-cols-3">
        <TabsTrigger value="claude">Claude Desktop</TabsTrigger>
        <TabsTrigger value="cursor">Cursor</TabsTrigger>
        <TabsTrigger value="curl">cURL</TabsTrigger>
      </TabsList>
      <SnippetTab tab="claude" code={claudeJson} field="snip-claude" copiedField={copiedField} onCopy={onCopy} hint="Add to ~/Library/Application Support/Claude/claude_desktop_config.json" />
      <SnippetTab tab="cursor" code={cursorJson} field="snip-cursor" copiedField={copiedField} onCopy={onCopy} hint="Add to .cursor/mcp.json in your workspace" />
      <SnippetTab tab="curl" code={curlSnippet} field="snip-curl" copiedField={copiedField} onCopy={onCopy} hint="Verify the connection from a shell" />
    </Tabs>
  )
}

function SnippetTab({
  tab,
  code,
  field,
  copiedField,
  onCopy,
  hint,
}: {
  tab: string
  code: string
  field: string
  copiedField: string | null
  onCopy: (v: string, f: string) => void
  hint: string
}) {
  const isCopied = copiedField === field
  return (
    <TabsContent value={tab} className="mt-3 space-y-2">
      <p className="text-xs text-muted-foreground">{hint}</p>
      <div className="relative">
        <pre className="rounded-md border border-border bg-muted/30 px-3 py-2.5 font-mono text-xs overflow-x-auto whitespace-pre">
          {code}
        </pre>
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 h-7 w-7 p-0"
          onClick={() => onCopy(code, field)}
          aria-label="Copy snippet"
        >
          {isCopied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground/70">
        Replace <code className="font-mono">&lt;CLIENT_SECRET&gt;</code> with the secret you saved at creation time.
      </p>
    </TabsContent>
  )
}
