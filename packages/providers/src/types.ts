import { SendRequest, SendResponse } from '@courierx/shared';

export interface EmailProvider {
    name: string;
    send(request: SendRequest): Promise<SendResponse>;
    validateConfig(): Promise<boolean>;
}

export interface ProviderConfig {
    [key: string]: any;
}

export interface ProviderFactory {
    create(config: ProviderConfig): EmailProvider;
}