import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { domainsService } from "@/services/domains.service"

export function useDomains() {
  return useQuery({
    queryKey: ["domains"],
    queryFn: () => domainsService.list(),
    staleTime: 10 * 60 * 1000,
    refetchInterval: (query) => {
      const data = query.state.data
      const anyPending = data?.some((d) => d.status === "pending_verification" || d.status === "pending")
      return anyPending ? 5000 : false
    },
    refetchIntervalInBackground: false,
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

export function useRecheckDomain() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => domainsService.recheck(id),
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
