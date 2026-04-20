import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { emailsService } from "@/services/emails.service"
import type { ListEmailsParams } from "@/services/emails.service"

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
