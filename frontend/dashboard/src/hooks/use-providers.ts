import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { providersService } from "@/services/providers.service"
import type { ProviderConnection, RoutingRule } from "@/services/providers.service"

export type { ProviderConnection, RoutingRule }

export function useProviderConnections() {
  return useQuery({
    queryKey: ["providerConnections"],
    queryFn: () => providersService.listConnections(),
  })
}

export function useCreateProviderConnection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: providersService.createConnection,
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

export function useRoutingRules() {
  return useQuery({
    queryKey: ["routingRules"],
    queryFn: () => providersService.listRules(),
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
