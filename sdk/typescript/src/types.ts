// ── Client Options ──────────────────────────────────────────────────────────

export interface CourierXOptions {
  /** API key (starts with cxk_live_ or cxk_test_) */
  apiKey: string
  /** Base URL of the CourierX API. Defaults to https://api.courierx.dev */
  baseUrl?: string
  /** Request timeout in milliseconds. Defaults to 30000 */
  timeout?: number
}

// ── Email Types ─────────────────────────────────────────────────────────────

export interface SendEmailRequest {
  /** Sender email address */
  from: string
  /** Sender display name */
  fromName?: string
  /** Recipient email address */
  to: string
  /** Recipient display name */
  toName?: string
  /** Reply-to email address */
  replyTo?: string
  /** Email subject line */
  subject: string
  /** HTML body */
  html?: string
  /** Plain text body */
  text?: string
  /** Tags for categorization */
  tags?: string[]
  /** Custom metadata. Include idempotencyKey for deduplication. */
  metadata?: Record<string, unknown>
}

export interface Email {
  id: string
  from_email: string
  to_email: string
  subject: string
  status: EmailStatus
  provider_message_id: string | null
  tags: string[]
  queued_at: string | null
  sent_at: string | null
  delivered_at: string | null
  created_at: string
}

export interface EmailWithEvents extends Email {
  events: EmailEvent[]
}

export interface EmailEvent {
  id: string
  event_type: string
  occurred_at: string
  provider: string | null
  bounce_type: string | null
  bounce_code: string | null
  link_url: string | null
}

export type EmailStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "bounced"
  | "complained"
  | "failed"
  | "suppressed"

export interface SendEmailResponse {
  email: Email
}

export interface ListEmailsParams {
  /** Filter by status */
  status?: EmailStatus
  /** Filter by recipient (substring match) */
  recipient?: string
  /** Start date (ISO 8601) */
  from?: string
  /** End date (ISO 8601) */
  to?: string
  /** Page number (1-based) */
  page?: number
  /** Results per page (default 25) */
  perPage?: number
}

// ── Domain Types ────────────────────────────────────────────────────────────

export interface Domain {
  id: string
  domain: string
  status: string
  verified_at: string | null
  created_at: string
}

// ── API Key Types ───────────────────────────────────────────────────────────

export interface ApiKey {
  id: string
  name: string
  prefix: string
  last_used_at: string | null
  created_at: string
  /** Only present on creation */
  key?: string
}

// ── Suppression Types ────────────────────────────────────────────────────────

export type SuppressionReason = "bounce" | "complaint" | "unsubscribe" | "manual"

export interface Suppression {
  id: string
  email: string
  reason: SuppressionReason
  created_at: string
}

export interface CreateSuppressionParams {
  email: string
  reason?: SuppressionReason
}

export interface ListSuppressionsParams {
  email?: string
  reason?: SuppressionReason
  page?: number
  perPage?: number
}

// ── Webhook Types ────────────────────────────────────────────────────────────

export type WebhookEvent =
  | "email.sent"
  | "email.delivered"
  | "email.bounced"
  | "email.complained"
  | "email.opened"
  | "email.clicked"
  | "email.failed"

export interface WebhookEndpoint {
  id: string
  url: string
  events: WebhookEvent[]
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface CreateWebhookParams {
  url: string
  events: WebhookEvent[]
  enabled?: boolean
}

export interface UpdateWebhookParams {
  url?: string
  events?: WebhookEvent[]
  enabled?: boolean
}

// ── Template Types ────────────────────────────────────────────────────────────

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  description: string | null
  html_body: string | null
  text_body: string | null
  status: "draft" | "active" | "archived"
  created_at: string
  updated_at: string
}

export interface CreateTemplateParams {
  name: string
  subject: string
  description?: string
  html_body?: string
  text_body?: string
}

export interface UpdateTemplateParams {
  name?: string
  subject?: string
  description?: string
  html_body?: string
  text_body?: string
  status?: "draft" | "active" | "archived"
}

// ── Error Types ─────────────────────────────────────────────────────────────

export interface CourierXErrorResponse {
  error?: string
  errors?: string[]
}
