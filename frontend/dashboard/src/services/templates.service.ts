import api from "./api"

export interface EmailTemplate {
  id: string
  name: string
  description: string | null
  subject: string | null
  category: string | null
  status: string
  version: number
  variables: TemplateVariable[]
  html_body?: string
  text_body?: string
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface TemplateVariable {
  name: string
  default: string
  required: boolean
}

export interface CreateTemplateParams {
  name: string
  description?: string
  subject?: string
  html_body?: string
  text_body?: string
  category?: string
  status?: string
  variables?: TemplateVariable[]
}

export interface GenerateTemplateParams {
  prompt: string
  category?: string
}

export interface RenderedPreview {
  subject: string
  html_body: string
  text_body: string
}

export const templatesService = {
  async list(params: { status?: string; category?: string; q?: string } = {}): Promise<EmailTemplate[]> {
    const { data } = await api.get<EmailTemplate[]>("/api/v1/email_templates", { params })
    return data
  },

  async get(id: string): Promise<EmailTemplate> {
    const { data } = await api.get<EmailTemplate>(`/api/v1/email_templates/${id}`)
    return data
  },

  async create(params: CreateTemplateParams): Promise<EmailTemplate> {
    const { data } = await api.post<EmailTemplate>("/api/v1/email_templates", params)
    return data
  },

  async update(id: string, params: Partial<CreateTemplateParams>): Promise<EmailTemplate> {
    const { data } = await api.patch<EmailTemplate>(`/api/v1/email_templates/${id}`, params)
    return data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/api/v1/email_templates/${id}`)
  },

  async preview(id: string, variables: Record<string, string> = {}): Promise<RenderedPreview> {
    const { data } = await api.post<RenderedPreview>(`/api/v1/email_templates/${id}/preview`, { variables })
    return data
  },

  async duplicate(id: string): Promise<EmailTemplate> {
    const { data } = await api.post<EmailTemplate>(`/api/v1/email_templates/${id}/duplicate`)
    return data
  },

  async generate(params: GenerateTemplateParams): Promise<Omit<EmailTemplate, "id" | "created_at" | "updated_at" | "version" | "status">> {
    const { data } = await api.post("/api/v1/email_templates/generate", params)
    return data
  },
}
