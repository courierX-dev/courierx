import { EmailProvider, ProviderConfig } from '../types';
import { SendRequest, SendResponse } from '@courierx/shared';

export interface SMTPConfig extends ProviderConfig {
    host: string;
    port: number;
    secure: boolean;
    auth: {
        user: string;
        pass: string;
    };
}

export class SMTPProvider implements EmailProvider {
    name = 'smtp';

    constructor(private config: SMTPConfig) { }

    async send(request: SendRequest): Promise<SendResponse> {
        // This would use nodemailer in production
        const messageId = `smtp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Mock implementation for now
        return {
            id: messageId,
            status: 'sent',
            provider: this.name,
            timestamp: new Date().toISOString(),
            metadata: {
                host: this.config.host,
                port: this.config.port,
            },
        };
    }

    async validateConfig(): Promise<boolean> {
        return !!(this.config.host && this.config.port && this.config.auth?.user && this.config.auth?.pass);
    }
}