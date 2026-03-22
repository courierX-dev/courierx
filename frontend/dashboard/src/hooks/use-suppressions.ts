import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { suppressionsService } from "@/services/suppressions.service"
import type { CreateSuppressionRequest } from "@/services/suppressions.service"

export function useSuppressions(params: { reason?: string } = {}) {
  return useQuery({
    queryKey: ["suppressions", params],
    queryFn: () => suppressionsService.list(params),
  })
}

export function useCreateSuppression() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: CreateSuppressionRequest) => suppressionsService.create(params),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppressions"] }),
  })
}

export function useDeleteSuppression() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => suppressionsService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppressions"] }),
  })
}
