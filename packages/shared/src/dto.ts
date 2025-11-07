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

export const CreateTemplateSchema = z.object({
    name: z.string().min(1).max(100),
    engine: z.enum(['hbs', 'handlebars']).default('hbs'),
    subjectTpl: z.string().min(1),
    htmlTpl: z.string().min(1),
});

export const UpdateTemplateSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    subjectTpl: z.string().min(1).optional(),
    htmlTpl: z.string().min(1).optional(),
});

export const SendTemplateRequestSchema = z.object({
    to: z.array(EmailAddressSchema).min(1),
    from: EmailAddressSchema,
    templateId: z.string().uuid(),
    variables: z.record(z.any()),
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
});

export const BatchRecipient = z.object({
    to: EmailAddressSchema,
    variables: z.record(z.any()).optional(),
    metadata: z.record(z.any()).optional(),
});

export const BulkSendRequestSchema = z.object({
    from: EmailAddressSchema,
    subject: z.string().min(1),
    html: z.string().optional(),
    text: z.string().optional(),
    recipients: z.array(BatchRecipient).min(1).max(1000), // Limit to 1000 recipients per batch
    replyTo: EmailAddressSchema.optional(),
    attachments: z.array(z.object({
        filename: z.string(),
        content: z.string(), // base64
        contentType: z.string(),
    })).optional(),
    tags: z.record(z.string()).optional(),
}).refine(
    (data) => data.html || data.text,
    { message: "Either html or text content is required" }
);

export const BulkSendResponseSchema = z.object({
    batchId: z.string(),
    total: z.number(),
    successful: z.number(),
    failed: z.number(),
    results: z.array(z.object({
        to: EmailAddressSchema,
        messageId: z.string().optional(),
        status: z.enum(['sent', 'failed']),
        error: z.string().optional(),
    })),
    timestamp: z.string().datetime(),
});

export type SendRequest = z.infer<typeof SendRequestSchema>;
export type SendResponse = z.infer<typeof SendResponseSchema>;
export type WebhookEvent = z.infer<typeof WebhookEventSchema>;
export type CreateTemplate = z.infer<typeof CreateTemplateSchema>;
export type UpdateTemplate = z.infer<typeof UpdateTemplateSchema>;
export type SendTemplateRequest = z.infer<typeof SendTemplateRequestSchema>;
export type BulkSendRequest = z.infer<typeof BulkSendRequestSchema>;
export type BulkSendResponse = z.infer<typeof BulkSendResponseSchema>;