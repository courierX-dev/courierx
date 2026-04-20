import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { teamService } from "@/services/team.service"
import type { CreateInvitationParams } from "@/services/team.service"

export function useTeamMembers() {
  return useQuery({
    queryKey: ["team-members"],
    queryFn: () => teamService.listMembers(),
  })
}

export function useUpdateMemberRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      teamService.updateMemberRole(id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team-members"] }),
  })
}

export function useRemoveMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => teamService.removeMember(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team-members"] }),
  })
}

export function useInvitations(status?: string) {
  return useQuery({
    queryKey: ["invitations", status],
    queryFn: () => teamService.listInvitations(status),
  })
}

export function useCreateInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: CreateInvitationParams) => teamService.createInvitation(params),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invitations"] }),
  })
}

export function useRevokeInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => teamService.revokeInvitation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invitations"] }),
  })
}

export function useResendInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => teamService.resendInvitation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invitations"] }),
  })
}
