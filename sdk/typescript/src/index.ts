import { HttpClient } from "./client"
import { Emails } from "./resources/emails"
import { Domains } from "./resources/domains"
import { ApiKeys } from "./resources/api-keys"
import { Suppressions } from "./resources/suppressions"
import { Webhooks } from "./resources/webhooks"
import { Templates } from "./resources/templates"
import type { CourierXOptions } from "./types"

export class CourierX {
  readonly emails: Emails
  readonly domains: Domains
  readonly apiKeys: ApiKeys
  readonly suppressions: Suppressions
  readonly webhooks: Webhooks
  readonly templates: Templates

  /**
   * Create a new CourierX client.
   *
   * @example
   * ```ts
   * import { CourierX } from "@courierx/node"
   *
   * const courierx = new CourierX({ apiKey: "cxk_live_your_api_key" })
   *
   * const result = await courierx.emails.send({
   *   from: "hello@yourapp.com",
   *   to: "user@example.com",
   *   subject: "Welcome!",
   *   html: "<h1>Welcome to our platform</h1>",
   * })
   * ```
   */
  constructor(options: CourierXOptions) {
    const client = new HttpClient(options)
    this.emails = new Emails(client)
    this.domains = new Domains(client)
    this.apiKeys = new ApiKeys(client)
    this.suppressions = new Suppressions(client)
    this.webhooks = new Webhooks(client)
    this.templates = new Templates(client)
  }
}

// Re-export types
export type {
  CourierXOptions,
  SendEmailRequest,
  SendEmailResponse,
  Email,
  EmailWithEvents,
  EmailEvent,
  EmailStatus,
  ListEmailsParams,
  Domain,
  ApiKey,
  Suppression,
  SuppressionReason,
  CreateSuppressionParams,
  ListSuppressionsParams,
  WebhookEndpoint,
  WebhookEvent,
  CreateWebhookParams,
  UpdateWebhookParams,
  EmailTemplate,
  CreateTemplateParams,
  UpdateTemplateParams,
} from "./types"

// Re-export errors
export { CourierXError, AuthenticationError, RateLimitError } from "./errors"
