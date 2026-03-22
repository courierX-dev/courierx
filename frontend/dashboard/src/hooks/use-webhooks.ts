import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { webhooksService } from "@/services/webhooks.service"

export function useWebhooks() {
  return useQuery({
    queryKey: ["webhooks"],
    queryFn: () => webhooksService.list(),
  })
}

export function useCreateWebhook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { url: string; description?: string; events: string[] }) =>
      webhooksService.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks"] }),
  })
}

export function useUpdateWebhook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; url?: string; description?: string; is_active?: boolean; events?: string[] }) =>
      webhooksService.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks"] }),
  })
}

export function useDeleteWebhook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => webhooksService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks"] }),
  })
}
