import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { mcpService } from "@/services/mcp.service"
import type { CreateMcpConnectionRequest } from "@/services/mcp.service"

export function useMcpConnections() {
  return useQuery({
    queryKey: ["mcpConnections"],
    queryFn: () => mcpService.list(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateMcpConnection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: CreateMcpConnectionRequest) => mcpService.create(params),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mcpConnections"] }),
  })
}

export function useDeleteMcpConnection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => mcpService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mcpConnections"] }),
  })
}
