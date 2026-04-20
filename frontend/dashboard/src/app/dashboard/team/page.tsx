"use client"

import { useState } from "react"
import { Users, UserPlus, MoreHorizontal, Copy, X, RefreshCcw, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PageShell } from "@/components/dashboard/page-shell"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionError } from "@/components/dashboard/inline-error"
import { cn } from "@/lib/utils"
import {
  useTeamMembers,
  useInvitations,
  useCreateInvitation,
  useRevokeInvitation,
  useResendInvitation,
  useRemoveMember,
  useUpdateMemberRole,
} from "@/hooks/use-team"
import { toast } from "sonner"

const ROLES = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "developer", label: "Developer" },
  { value: "viewer", label: "Viewer" },
]

const STATUS_STYLES: Record<string, string> = {
  pending:  "bg-warning/10 text-warning border-warning/20",
  accepted: "bg-success/10 text-success border-success/20",
  revoked:  "bg-muted text-muted-foreground border-muted",
  expired:  "bg-muted text-muted-foreground/60 border-muted",
}

export default function TeamPage() {
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("developer")
  const [invitedUrl, setInvitedUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [removeId, setRemoveId] = useState<string | null>(null)

  const members = useTeamMembers()
  const invitations = useInvitations()
  const createInvitation = useCreateInvitation()
  const revokeInvitation = useRevokeInvitation()
  const resendInvitation = useResendInvitation()
  const removeMember = useRemoveMember()
  const updateRole = useUpdateMemberRole()

  function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    createInvitation.mutate(
      { email: inviteEmail, role: inviteRole },
      {
        onSuccess: (data) => {
          toast.success("Invitation sent")
          setInviteEmail("")
          if (data.invite_url) setInvitedUrl(data.invite_url)
          else setInviteOpen(false)
        },
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
          toast.error(msg ?? "Failed to send invitation")
        },
      }
    )
  }

  async function handleCopyUrl() {
    if (!invitedUrl) return
    await navigator.clipboard.writeText(invitedUrl)
    setCopied(true)
    toast.success("Copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }

  function handleRevoke(id: string) {
    revokeInvitation.mutate(id, {
      onSuccess: () => toast.success("Invitation revoked"),
      onError: () => toast.error("Failed to revoke invitation"),
    })
  }

  function handleResend(id: string) {
    resendInvitation.mutate(id, {
      onSuccess: () => toast.success("Invitation resent"),
      onError: () => toast.error("Failed to resend invitation"),
    })
  }

  function handleRemove() {
    if (!removeId) return
    removeMember.mutate(removeId, {
      onSuccess: () => {
        toast.success("Member removed")
        setRemoveId(null)
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        toast.error(msg ?? "Failed to remove member")
      },
    })
  }

  function handleRoleChange(id: string, role: string) {
    updateRole.mutate(
      { id, role },
      {
        onSuccess: () => toast.success("Role updated"),
        onError: () => toast.error("Failed to update role"),
      }
    )
  }

  const pendingInvitations = invitations.data?.filter((i) => i.status === "pending") ?? []

  return (
    <PageShell>
      <PageHeader title="Team" subtitle="Manage your workspace members and invitations">
        <Button size="sm" onClick={() => setInviteOpen(true)}>
          <UserPlus className="mr-1.5 h-3.5 w-3.5" />
          Invite member
        </Button>
      </PageHeader>

      {/* Team Members */}
      <div className="space-y-2">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Members {members.data && <span className="ml-1">({members.data.length})</span>}
        </h2>

        {members.isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 rounded-md bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {members.isError && <SectionError message="Failed to load members" onRetry={members.refetch} />}

        {!members.isLoading && !members.isError && members.data?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center rounded-md border border-dashed border-border">
            <Users className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">No team members yet</p>
            <p className="mt-1 text-xs text-muted-foreground max-w-xs">
              Invite team members to collaborate on your workspace
            </p>
          </div>
        )}

        {!members.isLoading && !members.isError && members.data && members.data.length > 0 && (
          <div className="rounded-md border border-border divide-y divide-border">
            {members.data.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center shrink-0">
                  {(m.full_name || m.email).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{m.full_name || m.email}</div>
                  {m.full_name && (
                    <div className="text-[11px] text-muted-foreground truncate font-mono">{m.email}</div>
                  )}
                </div>
                <Select value={m.role} onValueChange={(v) => handleRoleChange(m.id, v)}>
                  <SelectTrigger className="h-7 w-[110px] text-[11px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value} className="text-xs">
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" aria-label="Member actions">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setRemoveId(m.id)}
                    >
                      <X className="mr-2 h-3.5 w-3.5" />
                      Remove member
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Pending Invitations ({pendingInvitations.length})
          </h2>
          <div className="rounded-md border border-border divide-y divide-border">
            {pendingInvitations.map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono truncate">{inv.email}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {inv.role} • expires {new Date(inv.expires_at).toLocaleDateString()}
                  </div>
                </div>
                <Badge variant="outline" className={cn("text-[10px] capitalize", STATUS_STYLES[inv.status])}>
                  {inv.status}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px]"
                  onClick={() => handleResend(inv.id)}
                  disabled={resendInvitation.isPending}
                >
                  <RefreshCcw className="mr-1 h-3 w-3" />
                  Resend
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => handleRevoke(inv.id)}
                  disabled={revokeInvitation.isPending}
                  aria-label="Revoke invitation"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Dialog */}
      <Dialog
        open={inviteOpen}
        onOpenChange={(open) => {
          if (!open) {
            setInviteOpen(false)
            setInvitedUrl(null)
            setInviteEmail("")
            setInviteRole("developer")
          }
        }}
      >
        <DialogContent>
          {invitedUrl ? (
            <>
              <DialogHeader>
                <DialogTitle>Invitation sent</DialogTitle>
                <DialogDescription>
                  Share this invitation link with your teammate. They can use it to join your workspace.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-2">
                <code className="flex-1 text-[11px] font-mono truncate">{invitedUrl}</code>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleCopyUrl} aria-label="Copy invite URL">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <DialogFooter>
                <Button size="sm" onClick={() => { setInviteOpen(false); setInvitedUrl(null) }}>
                  Done
                </Button>
              </DialogFooter>
            </>
          ) : (
            <form onSubmit={handleInvite}>
              <DialogHeader>
                <DialogTitle>Invite team member</DialogTitle>
                <DialogDescription>
                  They'll receive an invitation link to join this workspace.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="teammate@company.com"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="role" className="text-xs">Role</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value} className="text-xs">
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" size="sm" onClick={() => setInviteOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={createInvitation.isPending}>
                  {createInvitation.isPending ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    "Send invitation"
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Remove member confirmation */}
      <Dialog open={!!removeId} onOpenChange={(open) => !open && setRemoveId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove team member?</DialogTitle>
            <DialogDescription>
              This will revoke their access to the workspace. They can be re-invited later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setRemoveId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRemove}
              disabled={removeMember.isPending}
            >
              {removeMember.isPending ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
