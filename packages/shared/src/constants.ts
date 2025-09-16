export const PROVIDERS = {
    SENDGRID: 'sendgrid',
    SES: 'ses',
    MAILGUN: 'mailgun',
    SMTP: 'smtp',
    MOCK: 'mock',
} as const;

export const WEBHOOK_EVENTS = {
    DELIVERED: 'delivered',
    BOUNCED: 'bounced',
    COMPLAINED: 'complained',
    CLICKED: 'clicked',
    OPENED: 'opened',
} as const;

export const MESSAGE_STATUS = {
    QUEUED: 'queued',
    SENT: 'sent',
    FAILED: 'failed',
} as const;

export const RATE_LIMITS = {
    DEFAULT_REQUESTS_PER_MINUTE: 100,
    DEFAULT_REQUESTS_PER_HOUR: 1000,
} as const;