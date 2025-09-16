import { EmailProvider, ProviderConfig } from '../types';
import { SendRequest, SendResponse } from '@courierx/shared';

export interface MailgunConfig extends ProviderConfig {
  apiKey: string;
  domain: string;
  baseUrl?: string;
}

export class MailgunProvider implements EmailProvider {
  name = 'mailgun';

  constructor(private config: MailgunConfig) { }

  async send(request: SendRequest): Promise<SendResponse> {
    const baseUrl = this.config.baseUrl || 'https://api.mailgun.net/v3';
    const formData = new FormData();

    formData.append('from', request.from);
    formData.append('to', request.to.join(','));
    formData.append('subject', request.subject);

    if (request.text) formData.append('text', request.text);
    if (request.html) formData.append('html', request.html);
    if (request.cc) formData.append('cc', request.cc.join(','));
    if (request.bcc) formData.append('bcc', request.bcc.join(','));
    if (request.replyTo) formData.append('h:Reply-To', request.replyTo);

    const response = await fetch(`${baseUrl}/${this.config.domain}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`api:${this.config.apiKey}`).toString('base64')}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Mailgun API error: ${response.status}`);
    }

    const result = await response.json() as any;

    return {
      id: result.id || `mg_${Date.now()}`,
      status: 'sent',
      provider: this.name,
      timestamp: new Date().toISOString(),
    };
  }

  async validateConfig(): Promise<boolean> {
    try {
      const baseUrl = this.config.baseUrl || 'https://api.mailgun.net/v3';
      const response = await fetch(`${baseUrl}/domains/${this.config.domain}`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${this.config.apiKey}`).toString('base64')}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
