import { z } from 'zod';

export const EmailAddressSchema = z.string().email();

export const SendRequestSchema = z.object({
    to: z.array(EmailAddressSchema).min(1),
    from: EmailAddressSchema,
    subject: z.string().min(1),
    html: z.string().optional(),
    text: z.string().optional(),
    cc: z.array(EmailAddressSchema).optional(),
    bcc: z.array(EmailAddressSchema).optional(),
    replyTo: EmailAddressSchema.optional(),
    attachments: z.array(z.object({
        filename: z.string(),
        content: z.string(), // base64
        contentType: z.string(),
    })).optional(),
    tags: z.record(z.string()).optional(),
    metadata: z.record(z.any()).optional(),
}).refine(
    (data) => data.html || data.text,
    { message: "Either html or text content is required" }
);

export const SendResponseSchema = z.object({
    id: z.string(),
    status: z.enum(['queued', 'sent', 'failed']),
    provider: z.string(),
    timestamp: z.string().datetime(),
    metadata: z.record(z.any()).optional(),
});

export const WebhookEventSchema = z.object({
    id: z.string(),
    type: z.enum(['delivered', 'bounced', 'complained', 'clicked', 'opened']),
    messageId: z.string(),
    timestamp: z.string().datetime(),
    recipient: EmailAddressSchema,
    metadata: z.record(z.any()).optional(),
});

export type SendRequest = z.infer<typeof SendRequestSchema>;
export type SendResponse = z.infer<typeof SendResponseSchema>;
export type WebhookEvent = z.infer<typeof WebhookEventSchema>;