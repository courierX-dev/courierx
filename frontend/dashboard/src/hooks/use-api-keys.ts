import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiKeysService } from "@/services/api-keys.service"
import type { CreateApiKeyRequest } from "@/services/api-keys.service"

export function useApiKeys() {
  return useQuery({
    queryKey: ["apiKeys"],
    queryFn: () => apiKeysService.list(),
  })
}

export function useCreateApiKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: CreateApiKeyRequest) => apiKeysService.create(params),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["apiKeys"] }),
  })
}

export function useRevokeApiKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiKeysService.revoke(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["apiKeys"] }),
  })
}

export function useDeleteApiKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiKeysService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["apiKeys"] }),
  })
}
