"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Loader2, CheckCircle2, XCircle, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { teamService, type InvitationPublic } from "@/services/team.service"

type PageState = "loading" | "valid" | "invalid" | "expired" | "accepted" | "success" | "error"

export default function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()

  const [state, setState] = useState<PageState>("loading")
  const [invitation, setInvitation] = useState<InvitationPublic | null>(null)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    if (!token) return
    teamService
      .getInvitation(token)
      .then((data) => {
        setInvitation(data)
        if (data.status === "accepted") setState("accepted")
        else if (data.status === "revoked" || data.status === "expired") setState("expired")
        else setState("valid")
      })
      .catch(() => setState("invalid"))
  }, [token])

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setErrorMsg("")
    try {
      await teamService.acceptInvitation(token, {
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        password: password || undefined,
      })
      setState("success")
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Could not accept invitation. Please try again."
      setErrorMsg(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2">
          <div className="w-7 h-7 rounded-[7px] bg-[#2563EB] flex items-center justify-center text-[13px] font-bold text-white">
            C
          </div>
          <span className="text-[15px] font-semibold tracking-[-0.01em]">
            Courier<span className="text-[#2563EB]">X</span>
          </span>
        </div>

        {state === "loading" && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading invitation…</p>
          </div>
        )}

        {state === "invalid" && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <XCircle className="h-8 w-8 text-destructive" />
            <h1 className="text-base font-semibold">Invitation not found</h1>
            <p className="text-sm text-muted-foreground">
              This invitation link is invalid or has already been used.
            </p>
          </div>
        )}

        {(state === "expired" || state === "accepted") && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <XCircle className="h-8 w-8 text-muted-foreground" />
            <h1 className="text-base font-semibold">
              {state === "accepted" ? "Already accepted" : "Invitation expired"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {state === "accepted"
                ? "This invitation has already been accepted."
                : "This invitation has expired or been revoked. Ask your admin to resend it."}
            </p>
            <Button size="sm" variant="outline" onClick={() => router.push("/login")}>
              Go to login
            </Button>
          </div>
        )}

        {state === "success" && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            <h1 className="text-base font-semibold">You&apos;re in!</h1>
            <p className="text-sm text-muted-foreground">
              You&apos;ve joined <strong>{invitation?.tenant_name}</strong>. Log in to get started.
            </p>
            <Button size="sm" onClick={() => router.push("/login")}>
              Go to login
            </Button>
          </div>
        )}

        {state === "valid" && invitation && (
          <>
            <div className="space-y-1 text-center">
              <div className="flex justify-center mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
              </div>
              <h1 className="text-lg font-semibold">You&apos;ve been invited</h1>
              <p className="text-sm text-muted-foreground">
                Join <strong>{invitation.tenant_name}</strong> as{" "}
                <span className="capitalize">{invitation.role}</span>
              </p>
            </div>

            <form onSubmit={handleAccept} className="space-y-4">
              <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs font-mono text-muted-foreground">
                {invitation.email}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="first_name" className="text-xs">First name</Label>
                  <Input
                    id="first_name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jane"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="last_name" className="text-xs">Last name</Label>
                  <Input
                    id="last_name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Smith"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs">
                  Password <span className="text-muted-foreground">(if new account)</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  className="h-8 text-xs"
                />
              </div>

              {errorMsg && (
                <p className="text-xs text-destructive">{errorMsg}</p>
              )}

              <Button type="submit" className="w-full" size="sm" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Joining…
                  </>
                ) : (
                  `Join ${invitation.tenant_name}`
                )}
              </Button>

              <p className="text-center text-[11px] text-muted-foreground">
                Already have an account?{" "}
                <a href="/login" className="underline underline-offset-2">
                  Log in
                </a>
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
