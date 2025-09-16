import { EmailProvider, ProviderConfig } from '../types';
import { SendRequest, SendResponse } from '@courierx/shared';

export interface MockConfig extends ProviderConfig {
    shouldFail?: boolean;
    delay?: number;
}

export class MockProvider implements EmailProvider {
    name = 'mock';

    constructor(private config: MockConfig = {}) { }

    async send(request: SendRequest): Promise<SendResponse> {
        if (this.config.delay) {
            await new Promise(resolve => setTimeout(resolve, this.config.delay));
        }

        if (this.config.shouldFail) {
            throw new Error('Mock provider configured to fail');
        }

        const messageId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        return {
            id: messageId,
            status: 'sent',
            provider: this.name,
            timestamp: new Date().toISOString(),
            metadata: {
                recipients: request.to.length,
                hasAttachments: !!request.attachments?.length,
            },
        };
    }

    async validateConfig(): Promise<boolean> {
        return true;
    }
}