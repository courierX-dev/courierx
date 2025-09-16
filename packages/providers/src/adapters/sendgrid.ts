import { EmailProvider, ProviderConfig } from '../types';
import { SendRequest, SendResponse } from '@courierx/shared';

export interface SendGridConfig extends ProviderConfig {
    apiKey: string;
}

export class SendGridProvider implements EmailProvider {
    name = 'sendgrid';

    constructor(private config: SendGridConfig) { }

    async send(request: SendRequest): Promise<SendResponse> {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.config.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                personalizations: [{
                    to: request.to.map(email => ({ email })),
                    cc: request.cc?.map(email => ({ email })),
                    bcc: request.bcc?.map(email => ({ email })),
                }],
                from: { email: request.from },
                reply_to: request.replyTo ? { email: request.replyTo } : undefined,
                subject: request.subject,
                content: [
                    ...(request.text ? [{ type: 'text/plain', value: request.text }] : []),
                    ...(request.html ? [{ type: 'text/html', value: request.html }] : []),
                ],
                attachments: request.attachments?.map(att => ({
                    filename: att.filename,
                    content: att.content,
                    type: att.contentType,
                })),
                custom_args: request.tags,
            }),
        });

        if (!response.ok) {
            throw new Error(`SendGrid API error: ${response.status}`);
        }

        const messageId = response.headers.get('x-message-id') || `sg_${Date.now()}`;

        return {
            id: messageId,
            status: 'sent',
            provider: this.name,
            timestamp: new Date().toISOString(),
        };
    }

    async validateConfig(): Promise<boolean> {
        try {
            const response = await fetch('https://api.sendgrid.com/v3/user/profile', {
                headers: { 'Authorization': `Bearer ${this.config.apiKey}` },
            });
            return response.ok;
        } catch {
            return false;
        }
    }
}