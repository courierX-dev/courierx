"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save, Eye, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PageShell } from "@/components/dashboard/page-shell"
import { SectionError } from "@/components/dashboard/inline-error"
import { useTemplate, useUpdateTemplate } from "@/hooks/use-templates"
import { toast } from "sonner"

export default function TemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { data: template, isLoading, isError, refetch } = useTemplate(id)
  const updateMutation = useUpdateTemplate()

  const [showPreview, setShowPreview] = useState(false)
  const [form, setForm] = useState({
    name: "",
    description: "",
    subject: "",
    html_body: "",
    text_body: "",
    category: "",
    status: "draft",
  })

  useEffect(() => {
    if (template) {
      setForm({
        name:        template.name ?? "",
        description: template.description ?? "",
        subject:     template.subject ?? "",
        html_body:   template.html_body ?? "",
        text_body:   template.text_body ?? "",
        category:    template.category ?? "",
        status:      template.status ?? "draft",
      })
    }
  }, [template])

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error("Template name is required")
      return
    }

    updateMutation.mutate(
      {
        id,
        name: form.name,
        description: form.description || undefined,
        subject: form.subject || undefined,
        html_body: form.html_body || undefined,
        text_body: form.text_body || undefined,
        category: form.category || undefined,
        status: form.status,
      },
      {
        onSuccess: () => {
          toast.success("Template updated")
          router.push("/dashboard/templates")
        },
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
          toast.error(msg ?? "Failed to update template")
        },
      }
    )
  }

  if (isLoading) {
    return (
      <PageShell maxWidth="narrow">
        <div className="space-y-3">
          <div className="h-6 w-48 bg-muted animate-pulse rounded" />
          <div className="h-8 bg-muted animate-pulse rounded" />
          <div className="h-8 bg-muted animate-pulse rounded" />
          <div className="h-48 bg-muted animate-pulse rounded" />
        </div>
      </PageShell>
    )
  }

  if (isError) {
    return (
      <PageShell>
        <SectionError message="Failed to load template" onRetry={refetch} />
      </PageShell>
    )
  }

  return (
    <PageShell maxWidth="narrow">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/dashboard/templates" className="hover:text-foreground transition-colors flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" />
          Templates
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold tracking-tight">{template?.name}</h1>
        {template && (
          <div className="text-[10px] text-muted-foreground">v{template.version}</div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs">Name *</Label>
            <Input id="name" value={form.name} onChange={set("name")} className="h-8 text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="category" className="text-xs">Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transactional">Transactional</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="notification">Notification</SelectItem>
                <SelectItem value="onboarding">Onboarding</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description" className="text-xs">Description</Label>
          <Input id="description" value={form.description} onChange={set("description")} className="h-8 text-xs" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="subject" className="text-xs">Subject Line</Label>
          <Input id="subject" value={form.subject} onChange={set("subject")} className="h-8 text-xs font-mono" />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="html_body" className="text-xs">HTML Body</Label>
            {form.html_body && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-[10px]"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="mr-1 h-3 w-3" />
                {showPreview ? "Editor" : "Preview"}
              </Button>
            )}
          </div>
          {showPreview ? (
            <div
              className="rounded-md border border-border bg-white p-4 min-h-[300px]"
              dangerouslySetInnerHTML={{ __html: form.html_body }}
            />
          ) : (
            <textarea
              id="html_body"
              value={form.html_body}
              onChange={set("html_body")}
              rows={14}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
            />
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="text_body" className="text-xs">Plain Text Body</Label>
          <textarea
            id="text_body"
            value={form.text_body}
            onChange={set("text_body")}
            rows={4}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
            <SelectTrigger className="h-8 text-xs w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {template?.variables && template.variables.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs">Variables</Label>
            <div className="rounded-md border border-border p-3 space-y-1.5">
              {template.variables.map((v, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <code className="font-mono text-primary">{`{{${v.name}}}`}</code>
                  {v.required && <span className="text-[10px] text-destructive">required</span>}
                  {v.default && (
                    <span className="text-muted-foreground">default: <code className="font-mono">{v.default}</code></span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Button type="submit" size="sm" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="mr-1.5 h-3.5 w-3.5" />
                Save Changes
              </>
            )}
          </Button>
          <Link href="/dashboard/templates">
            <Button type="button" variant="ghost" size="sm">Cancel</Button>
          </Link>
        </div>
      </form>
    </PageShell>
  )
}
