import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { templatesService } from "@/services/templates.service"
import type { CreateTemplateParams, GenerateTemplateParams } from "@/services/templates.service"

export function useTemplates(params: { status?: string; category?: string; q?: string } = {}) {
  return useQuery({
    queryKey: ["templates", params],
    queryFn: () => templatesService.list(params),
  })
}

export function useTemplate(id: string) {
  return useQuery({
    queryKey: ["templates", id],
    queryFn: () => templatesService.get(id),
    enabled: !!id,
  })
}

export function useCreateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: CreateTemplateParams) => templatesService.create(params),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  })
}

export function useUpdateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...params }: Partial<CreateTemplateParams> & { id: string }) =>
      templatesService.update(id, params),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  })
}

export function useDeleteTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => templatesService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  })
}

export function useDuplicateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => templatesService.duplicate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  })
}

export function useGenerateTemplate() {
  return useMutation({
    mutationFn: (params: GenerateTemplateParams) => templatesService.generate(params),
  })
}
