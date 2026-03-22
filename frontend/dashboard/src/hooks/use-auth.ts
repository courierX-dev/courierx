import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { authService } from "@/services/auth.service"

export function useCurrentTenant() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => authService.getCurrentUser(),
    staleTime: 5 * 60 * 1000, // 5 min — avoid refetch on every navigation
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => authService.updateName(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["auth", "me"] }),
  })
}
