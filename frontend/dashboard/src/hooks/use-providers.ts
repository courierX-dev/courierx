import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { providersService } from "@/services/providers.service"
import type { ProviderConnection, RoutingRule } from "@/services/providers.service"

export type { ProviderConnection, RoutingRule }

export function useProviderConnections() {
  return useQuery({
    queryKey: ["providerConnections"],
    queryFn: () => providersService.listConnections(),
    staleTime: 3 * 60 * 1000,
    refetchInterval: 3 * 60 * 1000,
  })
}

export function useCreateProviderConnection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: providersService.createConnection,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["providerConnections"] }),
  })
}

export function useVerifyProviderConnection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: providersService.verifyConnection,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["providerConnections"] }),
  })
}

export function useDeleteProviderConnection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: providersService.deleteConnection,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["providerConnections"] }),
  })
}

export function useSetProviderConnectionStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "inactive" }) =>
      providersService.setConnectionStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["providerConnections"] }),
  })
}

export function useUpdateProviderConnection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: Parameters<typeof providersService.updateConnection>[1]
    }) => providersService.updateConnection(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["providerConnections"] }),
  })
}

export function useResyncProviderWebhook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => providersService.resyncWebhook(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["providerConnections"] }),
  })
}

export function useRoutingRules() {
  return useQuery({
    queryKey: ["routingRules"],
    queryFn: () => providersService.listRules(),
    staleTime: 10 * 60 * 1000,
  })
}

export function useCreateRoutingRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: providersService.createRule,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["routingRules"] }),
  })
}

export function useDeleteRoutingRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: providersService.deleteRule,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["routingRules"] }),
  })
}
