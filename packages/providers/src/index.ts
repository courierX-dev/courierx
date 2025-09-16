export * from './types';
export * from './adapters/sendgrid';
export * from './adapters/ses';
export * from './adapters/mailgun';
export * from './adapters/smtp';
export * from './adapters/mock';

import { ProviderFactory, ProviderConfig } from './types';
import { SendGridProvider, SendGridConfig } from './adapters/sendgrid';
import { SESProvider, SESConfig } from './adapters/ses';
import { MailgunProvider, MailgunConfig } from './adapters/mailgun';
import { SMTPProvider, SMTPConfig } from './adapters/smtp';
import { MockProvider, MockConfig } from './adapters/mock';

export function createProvider(type: string, config: ProviderConfig) {
    switch (type) {
        case 'sendgrid':
            return new SendGridProvider(config as SendGridConfig);
        case 'ses':
            return new SESProvider(config as SESConfig);
        case 'mailgun':
            return new MailgunProvider(config as MailgunConfig);
        case 'smtp':
            return new SMTPProvider(config as SMTPConfig);
        case 'mock':
            return new MockProvider(config as MockConfig);
        default:
            throw new Error(`Unknown provider type: ${type}`);
    }
}