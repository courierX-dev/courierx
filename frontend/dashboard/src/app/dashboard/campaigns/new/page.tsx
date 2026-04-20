"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageShell } from "@/components/dashboard/page-shell"
import { toast } from "sonner"
import { useSendEmail } from "@/hooks/use-emails"

export default function NewCampaignPage() {
  const router = useRouter()
  const sendEmail = useSendEmail()
  const [form, setForm] = useState({
    to: "",
    from: "",
    subject: "",
    html_body: "",
    text_body: "",
  })

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    try {
      await sendEmail.mutateAsync({
        to: form.to,
        from: form.from || undefined,
        subject: form.subject,
        html_body: form.html_body || `<p>${form.text_body}</p>`,
        text_body: form.text_body || undefined,
      })
      toast.success("Email sent", { description: `To ${form.to}` })
      router.push("/dashboard/campaigns")
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { error?: string } } }
      toast.error(apiErr.response?.data?.error ?? "Failed to send email")
    }
  }

  return (
    <PageShell maxWidth="narrow" gap="lg">
      {/* Back link */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to campaigns
      </button>

      <div>
        <h1 className="text-base font-semibold tracking-tight">New campaign</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Send an email through your configured providers
        </p>
      </div>

      <form onSubmit={handleSend} className="space-y-5">
        {/* Recipient */}
        <div className="space-y-1.5">
          <Label htmlFor="to">
            Recipient <span className="text-destructive">*</span>
          </Label>
          <Input
            id="to"
            type="email"
            placeholder="user@example.com"
            value={form.to}
            onChange={set("to")}
            required
          />
        </div>

        {/* From */}
        <div className="space-y-1.5">
          <Label htmlFor="from">
            From <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id="from"
            type="email"
            placeholder="noreply@yourdomain.com"
            value={form.from}
            onChange={set("from")}
          />
          <p className="text-[11px] text-muted-foreground">
            Defaults to your verified domain if left blank
          </p>
        </div>

        {/* Subject */}
        <div className="space-y-1.5">
          <Label htmlFor="subject">
            Subject <span className="text-destructive">*</span>
          </Label>
          <Input
            id="subject"
            placeholder="Your email subject line"
            value={form.subject}
            onChange={set("subject")}
            required
          />
        </div>

        {/* Body */}
        <div className="space-y-1.5">
          <Label htmlFor="body">
            Body <span className="text-destructive">*</span>
          </Label>
          <textarea
            id="body"
            placeholder="Write your email content here..."
            value={form.text_body}
            onChange={set("text_body")}
            required
            rows={8}
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y"
          />
        </div>

        {/* HTML body (collapsed) */}
        <details className="group">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
            Advanced: custom HTML body
          </summary>
          <div className="mt-3 space-y-1.5">
            <Label htmlFor="html_body">HTML body</Label>
            <textarea
              id="html_body"
              placeholder="<html><body>Your HTML content</body></html>"
              value={form.html_body}
              onChange={set("html_body")}
              rows={6}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y"
            />
            <p className="text-[11px] text-muted-foreground">
              If provided, this overrides the plain text body for HTML-capable clients
            </p>
          </div>
        </details>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" size="sm" className="gap-1.5" disabled={sendEmail.isPending}>
            {sendEmail.isPending ? (
              "Sending..."
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                Send email
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            disabled={sendEmail.isPending}
          >
            Cancel
          </Button>
        </div>
      </form>
    </PageShell>
  )
}
