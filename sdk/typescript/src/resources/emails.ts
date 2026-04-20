import type { HttpClient } from "../client"
import type {
  SendEmailRequest,
  SendEmailResponse,
  Email,
  EmailWithEvents,
  ListEmailsParams,
} from "../types"

export class Emails {
  constructor(private readonly client: HttpClient) {}

  /**
   * Send an email.
   *
   * @example
   * ```ts
   * const result = await courierx.emails.send({
   *   from: "hello@yourapp.com",
   *   to: "user@example.com",
   *   subject: "Welcome!",
   *   html: "<h1>Welcome to our platform</h1>",
   * })
   * console.log(result.email.id, result.email.status) // uuid, "queued"
   * ```
   */
  async send(params: SendEmailRequest): Promise<SendEmailResponse> {
    const body: Record<string, unknown> = {
      from_email: params.from,
      to_email: params.to,
      subject: params.subject,
    }
    if (params.fromName) body.from_name = params.fromName
    if (params.toName) body.to_name = params.toName
    if (params.replyTo) body.reply_to = params.replyTo
    if (params.html) body.html_body = params.html
    if (params.text) body.text_body = params.text
    if (params.tags) body.tags = params.tags
    if (params.metadata) body.metadata = params.metadata

    return this.client.post<SendEmailResponse>("/api/v1/emails", body)
  }

  /**
   * List emails with optional filters.
   *
   * @example
   * ```ts
   * const emails = await courierx.emails.list({ status: "delivered", page: 1 })
   * ```
   */
  async list(params?: ListEmailsParams): Promise<Email[]> {
    const query: Record<string, string> = {}
    if (params?.status) query.status = params.status
    if (params?.recipient) query.recipient = params.recipient
    if (params?.from) query.from = params.from
    if (params?.to) query.to = params.to
    if (params?.page) query.page = String(params.page)
    if (params?.perPage) query.per_page = String(params.perPage)

    return this.client.get<Email[]>("/api/v1/emails", query)
  }

  /**
   * Get a single email by ID, including its event timeline.
   *
   * @example
   * ```ts
   * const email = await courierx.emails.get("email-uuid")
   * console.log(email.status, email.events.length)
   * ```
   */
  async get(id: string): Promise<EmailWithEvents> {
    return this.client.get<EmailWithEvents>(`/api/v1/emails/${id}`)
  }
}
