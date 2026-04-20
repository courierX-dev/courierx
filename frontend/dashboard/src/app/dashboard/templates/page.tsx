"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search, Plus, FileText, MoreHorizontal, Copy, Trash2, Sparkles } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PageShell } from "@/components/dashboard/page-shell"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionError } from "@/components/dashboard/inline-error"
import { cn } from "@/lib/utils"
import { useTemplates, useDeleteTemplate, useDuplicateTemplate } from "@/hooks/use-templates"
import { toast } from "sonner"

const STATUS_STYLES: Record<string, string> = {
  active:   "bg-success/10 text-success border-success/20",
  draft:    "bg-muted text-muted-foreground border-muted",
  archived: "bg-muted text-muted-foreground/60 border-muted",
}

const CATEGORY_LABELS: Record<string, string> = {
  transactional: "Transactional",
  marketing:     "Marketing",
  notification:  "Notification",
  onboarding:    "Onboarding",
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function TemplatesPage() {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { data: templates, isLoading, isError, refetch } = useTemplates({ q: search || undefined })
  const deleteMutation = useDeleteTemplate()
  const duplicateMutation = useDuplicateTemplate()

  function handleDelete() {
    if (!deleteId) return
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Template deleted")
        setDeleteId(null)
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        toast.error(msg ?? "Failed to delete template")
      },
    })
  }

  function handleDuplicate(id: string) {
    duplicateMutation.mutate(id, {
      onSuccess: () => toast.success("Template duplicated"),
      onError: () => toast.error("Failed to duplicate template"),
    })
  }

  return (
    <PageShell>
      <PageHeader title="Email Templates" subtitle="Create and manage reusable email templates">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/templates/new?mode=ai">
            <Button variant="outline" size="sm">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Generate with AI
            </Button>
          </Link>
          <Link href="/dashboard/templates/new">
            <Button size="sm">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New template
            </Button>
          </Link>
        </div>
      </PageHeader>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-8 text-xs"
        />
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-md bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {isError && <SectionError message="Failed to load templates" onRetry={refetch} />}

      {!isLoading && !isError && templates?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="mb-4 h-10 w-10 text-muted-foreground" />
          <h3 className="text-sm font-medium">No templates yet</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-xs">
            Create reusable email templates to send consistent, professional emails
          </p>
          <div className="flex items-center gap-2 mt-4">
            <Link href="/dashboard/templates/new?mode=ai">
              <Button variant="outline" size="sm">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Generate with AI
              </Button>
            </Link>
            <Link href="/dashboard/templates/new">
              <Button size="sm">Create template</Button>
            </Link>
          </div>
        </div>
      )}

      {!isLoading && !isError && templates && templates.length > 0 && (
        <div className="rounded-md border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Subject</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Category</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Updated</th>
                <th className="px-3 py-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-border last:border-0 hover:bg-muted/20 cursor-pointer transition-colors"
                  onClick={() => router.push(`/dashboard/templates/${t.id}`)}
                >
                  <td className="px-3 py-2.5">
                    <div className="font-medium">{t.name}</div>
                    {t.description && (
                      <div className="text-muted-foreground truncate max-w-xs mt-0.5">{t.description}</div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground truncate max-w-[200px]">
                    {t.subject || "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    {t.category ? (
                      <span className="text-muted-foreground">
                        {CATEGORY_LABELS[t.category] ?? t.category}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] capitalize", STATUS_STYLES[t.status])}
                    >
                      {t.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{timeAgo(t.updated_at)}</td>
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" aria-label="Template actions">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDuplicate(t.id)}>
                          <Copy className="mr-2 h-3.5 w-3.5" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteId(t.id)}
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete template?</DialogTitle>
            <DialogDescription>
              This will permanently delete this template. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
