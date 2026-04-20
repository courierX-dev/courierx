import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { domainsService } from "@/services/domains.service"

export function useDomains() {
  return useQuery({
    queryKey: ["domains"],
    queryFn: () => domainsService.list(),
    staleTime: 10 * 60 * 1000,
  })
}

export function useCreateDomain() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (domain: string) => domainsService.create(domain),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["domains"] }),
  })
}

export function useVerifyDomain() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => domainsService.verify(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["domains"] }),
  })
}

export function useDeleteDomain() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => domainsService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["domains"] }),
  })
}
