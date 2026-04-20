import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { emailsService } from "@/services/emails.service"
import type { ListEmailsParams, SendEmailParams } from "@/services/emails.service"

export function useEmails(params: ListEmailsParams = {}) {
  return useQuery({
    queryKey: ["emails", params],
    queryFn: () => emailsService.list(params),
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  })
}

export function useEmail(id: string) {
  return useQuery({
    queryKey: ["emails", id],
    queryFn: () => emailsService.get(id),
    enabled: !!id,
  })
}

export function useSendEmail() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: SendEmailParams) => emailsService.send(params),
    onSuccess: () => {
      // Bust all period caches so dashboard metrics reflect the new send
      qc.invalidateQueries({ queryKey: ["dashboard", "metrics"] })
      // Bust email lists (logs, overview campaign table)
      qc.invalidateQueries({ queryKey: ["emails"] })
    },
  })
}
