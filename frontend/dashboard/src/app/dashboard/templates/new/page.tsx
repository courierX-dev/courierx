"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Save, Sparkles, Eye, Loader2 } from "lucide-react"
import Link from "next/link"
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
import { useCreateTemplate, useGenerateTemplate } from "@/hooks/use-templates"
import { toast } from "sonner"

export default function NewTemplatePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isAiMode = searchParams.get("mode") === "ai"

  const [aiPrompt, setAiPrompt] = useState("")
  const [showPreview, setShowPreview] = useState(false)
  const [form, setForm] = useState({
    name: "",
    description: "",
    subject: "",
    html_body: "",
    text_body: "",
    category: "",
    status: "draft" as string,
  })

  const createMutation = useCreateTemplate()
  const generateMutation = useGenerateTemplate()

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  async function handleGenerate() {
    if (!aiPrompt.trim()) return

    generateMutation.mutate(
      { prompt: aiPrompt, category: form.category || undefined },
      {
        onSuccess: (data) => {
          setForm((prev) => ({
            ...prev,
            name: data.name || prev.name,
            subject: data.subject || prev.subject,
            html_body: data.html_body || prev.html_body,
            text_body: data.text_body || prev.text_body,
          }))
          toast.success("Template generated")
        },
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
          toast.error(msg ?? "Failed to generate template")
        },
      }
    )
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error("Template name is required")
      return
    }

    createMutation.mutate(
      {
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
          toast.success("Template created")
          router.push("/dashboard/templates")
        },
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
          toast.error(msg ?? "Failed to create template")
        },
      }
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

      <h1 className="text-base font-semibold tracking-tight">
        {isAiMode ? "Generate Template with AI" : "New Template"}
      </h1>

      {/* AI Generation Section */}
      {isAiMode && (
        <div className="rounded-md border border-border p-4 bg-muted/20 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-primary" />
            Describe your email
          </div>
          <textarea
            placeholder="e.g. Welcome email for new SaaS users with a getting started CTA..."
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
          />
          <div className="flex items-center gap-2">
            <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transactional">Transactional</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="notification">Notification</SelectItem>
                <SelectItem value="onboarding">Onboarding</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={handleGenerate}
              disabled={generateMutation.isPending || !aiPrompt.trim()}
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs">Name *</Label>
            <Input id="name" value={form.name} onChange={set("name")} placeholder="Welcome Email" className="h-8 text-xs" />
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
          <Input id="description" value={form.description} onChange={set("description")} placeholder="Brief description of this template" className="h-8 text-xs" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="subject" className="text-xs">Subject Line</Label>
          <Input id="subject" value={form.subject} onChange={set("subject")} placeholder="Welcome to {{company_name}}, {{first_name}}!" className="h-8 text-xs font-mono" />
          <p className="text-[10px] text-muted-foreground">Use {"{{variable}}"} for dynamic content</p>
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
              placeholder="<h1>Hello {{first_name}}</h1>"
              rows={12}
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
            placeholder="Hello {{first_name}}..."
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
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button type="submit" size="sm" disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="mr-1.5 h-3.5 w-3.5" />
                Save Template
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
