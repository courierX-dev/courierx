export type ProviderType =
  | "sendgrid"
  | "mailgun"
  | "ses"
  | "smtp"
  | "postmark"
  | "resend"

export type { ProviderConnection, RoutingRule } from "@/services/providers.service"
