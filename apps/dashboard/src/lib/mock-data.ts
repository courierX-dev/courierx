export type ProjectMode = "demo" | "byok" | "managed"
export type ProviderStatus = "healthy" | "degraded" | "down"
export type MessageStatus =
  | "delivered" | "opened" | "clicked"
  | "bounced"  | "failed" | "queued" | "sent"

export const WORKSPACE = {
  id:           "ws_01",
  name:         "Acme Corp",
  slug:         "acme-corp",
  plan:         "pro" as const,
  usage:        { used: 8_432, limit: 10_000 },
  member_count: 4,
}

export const PROJECT = {
  id:          "proj_01",
  name:        "Production",
  mode:        "managed" as ProjectMode,
  status:      "active" as const,
  created_at:  "2024-09-15T10:00:00Z",
  trust_score: 87,
}

export const DOMAINS = [
  { id: "dom_01", domain: "acme.com",        type: "sending",  status: "verified",   dkim: true,  spf: true,  dmarc: true  },
  { id: "dom_02", domain: "mail.acme.com",   type: "sending",  status: "verified",   dkim: true,  spf: true,  dmarc: false },
  { id: "dom_03", domain: "track.acme.com",  type: "tracking", status: "unverified", dkim: false, spf: false, dmarc: false },
]

export const PROVIDER_PERFORMANCE = [
  { id: "prov_01", name: "Amazon SES", type: "ses",      status: "healthy",  latency_ms: 142, rate: 99.8, sent_today: 6_210, priority: 1 },
  { id: "prov_02", name: "SendGrid",   type: "sendgrid", status: "healthy",  latency_ms: 198, rate: 99.1, sent_today: 1_892, priority: 2 },
  { id: "prov_03", name: "Mailgun",    type: "mailgun",  status: "degraded", latency_ms: 890, rate: 97.3, sent_today: 330,   priority: 3 },
]

export const METRICS = {
  sent_24h:      14_832,
  delivered:     14_695,
  bounced:       91,
  open_rate:     32.4,
  click_rate:    8.7,
  delivery_rate: 99.08,
  changes: {
    sent:      +12.4,
    delivered: +11.9,
    bounced:   -2.1,
    open_rate: +1.3,
  },
}

export const CHART_DATA = [
  { date: "Feb 17", sent: 11_200, delivered: 11_082, bounced: 72 },
  { date: "Feb 18", sent: 12_450, delivered: 12_298, bounced: 98 },
  { date: "Feb 19", sent:  9_870, delivered:  9_781, bounced: 64 },
  { date: "Feb 20", sent: 13_100, delivered: 12_989, bounced: 83 },
  { date: "Feb 21", sent: 14_200, delivered: 14_072, bounced: 95 },
  { date: "Feb 22", sent: 13_750, delivered: 13_618, bounced: 88 },
  { date: "Feb 23", sent: 14_832, delivered: 14_695, bounced: 91 },
]

export const LOGS = [
  { id: "msg_001", ts: "2025-02-23 14:32:01", to: "alex@acme.com",       subject: "Welcome to CourierX",        status: "delivered", provider: "SES",      ms: 142 },
  { id: "msg_002", ts: "2025-02-23 14:31:47", to: "sarah@startup.io",    subject: "Invoice #1042",               status: "opened",    provider: "SES",      ms: 156 },
  { id: "msg_003", ts: "2025-02-23 14:30:22", to: "noreply@domain.xyz",  subject: "Password reset",              status: "bounced",   provider: "SendGrid", ms: 310 },
  { id: "msg_004", ts: "2025-02-23 14:29:58", to: "user@example.com",    subject: "Your weekly report",          status: "delivered", provider: "SES",      ms: 139 },
  { id: "msg_005", ts: "2025-02-23 14:28:33", to: "billing@corp.com",    subject: "Payment confirmation",        status: "clicked",   provider: "SendGrid", ms: 201 },
  { id: "msg_006", ts: "2025-02-23 14:27:11", to: "admin@test.net",      subject: "Account verification",        status: "queued",    provider: "—",        ms: 0   },
  { id: "msg_007", ts: "2025-02-23 14:26:45", to: "jane@enterprise.org", subject: "Onboarding complete",         status: "delivered", provider: "SES",      ms: 147 },
  { id: "msg_008", ts: "2025-02-23 14:25:09", to: "mark@demo.co",        subject: "API key created",             status: "delivered", provider: "Mailgun",  ms: 423 },
  { id: "msg_009", ts: "2025-02-23 14:24:33", to: "invalid@.broken",     subject: "Test email",                  status: "failed",    provider: "SES",      ms: 55  },
  { id: "msg_010", ts: "2025-02-23 14:23:17", to: "team@company.io",     subject: "New member invited",          status: "delivered", provider: "SES",      ms: 133 },
  { id: "msg_011", ts: "2025-02-23 14:22:04", to: "ops@infra.net",       subject: "Alert: disk usage high",      status: "delivered", provider: "SES",      ms: 128 },
  { id: "msg_012", ts: "2025-02-23 14:21:50", to: "cto@bigco.com",       subject: "Monthly report — Feb 2025",  status: "opened",    provider: "SES",      ms: 143 },
  { id: "msg_013", ts: "2025-02-23 14:20:33", to: "dev@startup.io",      subject: "API rate limit warning",      status: "delivered", provider: "SendGrid", ms: 209 },
  { id: "msg_014", ts: "2025-02-23 14:19:21", to: "hr@enterprise.org",   subject: "New hire onboarding",         status: "delivered", provider: "SES",      ms: 155 },
  { id: "msg_015", ts: "2025-02-23 14:18:07", to: "support@saas.co",     subject: "Ticket #4821 closed",         status: "clicked",   provider: "SendGrid", ms: 188 },
]

export const SUPPRESSIONS = [
  { id: "sup_01", email: "noreply@domain.xyz",   reason: "hard_bounce", suppressed_at: "2025-02-23 14:30", source: "automatic" },
  { id: "sup_02", email: "invalid@.broken",      reason: "hard_bounce", suppressed_at: "2025-02-23 14:24", source: "automatic" },
  { id: "sup_03", email: "unsubscribe@test.com", reason: "unsubscribe", suppressed_at: "2025-02-20 08:14", source: "recipient" },
  { id: "sup_04", email: "spam@report.net",      reason: "complaint",   suppressed_at: "2025-02-18 16:55", source: "recipient" },
  { id: "sup_05", email: "old@example.com",      reason: "manual",      suppressed_at: "2025-01-30 11:22", source: "manual"    },
]

export const WEBHOOKS = [
  { id: "wh_01", name: "Delivery events",    url: "https://hooks.acme.com/delivery",   events: ["delivered", "bounced", "failed"], status: "active",   last_triggered: "2025-02-23 14:32", success_rate: 100 },
  { id: "wh_02", name: "Engagement tracker", url: "https://hooks.acme.com/engagement", events: ["opened", "clicked"],              status: "active",   last_triggered: "2025-02-23 14:31", success_rate: 98  },
  { id: "wh_03", name: "Staging hook",       url: "https://staging.acme.com/webhook",  events: ["delivered", "bounced"],           status: "inactive", last_triggered: "2025-02-10 09:15", success_rate: 94  },
]

export const API_KEYS = [
  { id: "ak_01", name: "Production API",  prefix: "sk_prod_4f2a", scopes: ["send", "analytics"], status: "active",  created_at: "2024-09-15", last_used: "2025-02-23" },
  { id: "ak_02", name: "CI/CD Pipeline",  prefix: "sk_prod_9c7b", scopes: ["send"],               status: "active",  created_at: "2024-11-02", last_used: "2025-02-22" },
  { id: "ak_03", name: "Dev / Testing",   prefix: "sk_test_1e3d", scopes: ["send", "analytics"], status: "active",  created_at: "2025-01-08", last_used: "2025-02-20" },
  { id: "ak_04", name: "Old integration", prefix: "sk_prod_8a1c", scopes: ["send"],               status: "revoked", created_at: "2024-07-01", last_used: "2024-12-31" },
]

export const FAILOVER_LOG = [
  { id: "fl_01", ts: "2025-02-19 03:14", from: "Mailgun",  to: "SendGrid", reason: "rate_limit",   recovered_at: "2025-02-19 03:47", duration_min: 33 },
  { id: "fl_02", ts: "2025-01-31 18:02", from: "SES",      to: "SendGrid", reason: "5xx_errors",   recovered_at: "2025-01-31 18:21", duration_min: 18 },
  { id: "fl_03", ts: "2025-01-15 09:33", from: "SendGrid", to: "SES",      reason: "auth_failure", recovered_at: "2025-01-15 09:41", duration_min: 8  },
]

export const ROUTING_RULES = [
  { id: "rr_01", name: "Transactional", condition: "tags contains 'transactional'", provider: "Amazon SES", priority: 1  },
  { id: "rr_02", name: "Marketing",     condition: "tags contains 'marketing'",     provider: "SendGrid",   priority: 2  },
  { id: "rr_03", name: "Default",       condition: "— (catch-all)",                 provider: "Amazon SES", priority: 99 },
]

export const INVOICES = [
  { id: "inv_feb25", date: "Feb 1, 2025", amount: "$79.00", status: "paid" },
  { id: "inv_jan25", date: "Jan 1, 2025", amount: "$79.00", status: "paid" },
  { id: "inv_dec24", date: "Dec 1, 2024", amount: "$79.00", status: "paid" },
  { id: "inv_nov24", date: "Nov 1, 2024", amount: "$79.00", status: "paid" },
]
