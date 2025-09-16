import { SendRequest, SendResponse } from '@courierx/shared';

export interface CourierXClientConfig {
    apiKey: string;
    baseUrl?: string;
}

export class CourierXClient {
    private baseUrl: string;
    private apiKey: string;

    constructor(config: CourierXClientConfig) {
        this.apiKey = config.apiKey;
        this.baseUrl = config.baseUrl || 'https://api.courierx.dev';
    }

    async send(request: SendRequest): Promise<SendResponse> {
        const response = await fetch(`${this.baseUrl}/v1/send`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`CourierX API error: ${response.status} - ${error}`);
        }

        return response.json() as Promise<SendResponse>;
    }

    async getStatus(messageId: string): Promise<{ status: string; events: any[] }> {
        const response = await fetch(`${this.baseUrl}/v1/messages/${messageId}`, {
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
            },
        });

        if (!response.ok) {
            throw new Error(`CourierX API error: ${response.status}`);
        }

        return response.json() as Promise<{ status: string; events: any[] }>;
    }
}
