import type { HttpClient } from "../client"
import type { EmailTemplate, CreateTemplateParams, UpdateTemplateParams } from "../types"

export class Templates {
  constructor(private readonly client: HttpClient) {}

  /**
   * List all email templates.
   *
   * @example
   * ```ts
   * const templates = await courierx.templates.list()
   * ```
   */
  async list(): Promise<EmailTemplate[]> {
    return this.client.get<EmailTemplate[]>("/api/v1/email_templates")
  }

  /**
   * Get a single template by ID.
   *
   * @example
   * ```ts
   * const tpl = await courierx.templates.get("template-uuid")
   * ```
   */
  async get(id: string): Promise<EmailTemplate> {
    return this.client.get<EmailTemplate>(`/api/v1/email_templates/${id}`)
  }

  /**
   * Create a new email template.
   *
   * @example
   * ```ts
   * const tpl = await courierx.templates.create({
   *   name: "Welcome email",
   *   subject: "Welcome to {{company_name}}",
   *   html_body: "<h1>Hi {{first_name}}, welcome!</h1>",
   * })
   * ```
   */
  async create(params: CreateTemplateParams): Promise<EmailTemplate> {
    return this.client.post<EmailTemplate>("/api/v1/email_templates", params)
  }

  /**
   * Update an existing email template.
   *
   * @example
   * ```ts
   * await courierx.templates.update("template-uuid", { subject: "New subject" })
   * ```
   */
  async update(id: string, params: UpdateTemplateParams): Promise<EmailTemplate> {
    return this.client.patch<EmailTemplate>(`/api/v1/email_templates/${id}`, params)
  }

  /**
   * Delete a template.
   *
   * @example
   * ```ts
   * await courierx.templates.delete("template-uuid")
   * ```
   */
  async delete(id: string): Promise<void> {
    return this.client.delete(`/api/v1/email_templates/${id}`)
  }

  /**
   * Duplicate a template.
   *
   * @example
   * ```ts
   * const copy = await courierx.templates.duplicate("template-uuid")
   * ```
   */
  async duplicate(id: string): Promise<EmailTemplate> {
    return this.client.post<EmailTemplate>(`/api/v1/email_templates/${id}/duplicate`)
  }
}
