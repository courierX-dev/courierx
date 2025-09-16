// Basic TypeScript interfaces for shared use
// Note: Swagger decorators are added in the API layer

export interface Attachment {
    filename: string;
    content: string;
    contentType?: string;
}

export interface SendRequest {
    to: string[];
    from: string;
    replyTo?: string;
    subject: string;
    text?: string;
    html?: string;
    attachments?: Attachment[];
    headers?: Record<string, string>;
    tags?: string[];
    metadata?: Record<string, any>;
}

export interface SendResponse {
    messageId: string;
    status: 'sent' | 'failed';
    provider: string;
    timestamp: string;
    error?: string;
    providerMessageId?: string;
}
