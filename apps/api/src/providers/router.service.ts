import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createProvider } from '@courierx/providers';
import { SendRequest, SendResponse } from '@courierx/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorClassifier, ErrorType } from '../common/errors/error-taxonomy';
import { Env } from '../common/env';

@Injectable()
export class ProvidersRouterService {
    constructor(
        private config: ConfigService<Env>,
        private prisma: PrismaService
    ) { }

    async send(request: SendRequest, productId: string): Promise<SendResponse> {
        // Fetch routes for the product ordered by role (primary first) then priority
        const routes = await this.prisma.route.findMany({
            where: { productId },
            include: {
                provider: true,
            },
            orderBy: [
                { role: 'desc' }, // primary before secondary
                { priority: 'asc' }, // lower priority number = higher priority
            ],
        });

        if (routes.length === 0) {
            // Fallback to mock provider if no routes configured
            const mockProvider = createProvider('mock', {});
            return await mockProvider.send(request);
        }

        let lastError: Error | null = null;

        // Try providers in route order
        for (const route of routes) {
            try {
                const provider = await this.createProviderFromRoute(route);
                const response = await provider.send(request);
                return response;
            } catch (error) {
                const classifiedError = ErrorClassifier.classify(error as Error, route.provider.type);
                lastError = error as Error;

                console.warn(`Provider ${route.provider.type} failed:`, {
                    error: classifiedError.message,
                    type: classifiedError.type,
                    category: classifiedError.category,
                    retryable: classifiedError.retryable
                });

                // If this is a permanent error, don't try other providers for this specific issue
                if (classifiedError.type === ErrorType.PERMANENT &&
                    ['authentication', 'invalid_request', 'invalid_email'].includes(classifiedError.category)) {
                    throw new Error(`Permanent error: ${classifiedError.message}`);
                }

                // Continue to next provider for transient errors
            }
        }

        throw lastError || new Error('All configured providers failed');
    }

    private async createProviderFromRoute(route: any) {
        const providerType = route.provider.type;
        const credsMeta = route.provider.credsMeta || {};

        switch (providerType) {
            case 'sendgrid':
                return createProvider('sendgrid', {
                    apiKey: this.config.get('SENDGRID_API_KEY') || credsMeta.apiKey,
                });

            case 'mailgun':
                return createProvider('mailgun', {
                    apiKey: this.config.get('MAILGUN_API_KEY') || credsMeta.apiKey,
                    domain: this.config.get('MAILGUN_DOMAIN') || credsMeta.domain,
                });

            case 'ses':
                return createProvider('ses', {
                    accessKeyId: this.config.get('AWS_ACCESS_KEY_ID') || credsMeta.accessKeyId,
                    secretAccessKey: this.config.get('AWS_SECRET_ACCESS_KEY') || credsMeta.secretAccessKey,
                    region: this.config.get('AWS_REGION') || credsMeta.region || 'us-east-1',
                });

            case 'smtp':
                return createProvider('smtp', {
                    host: this.config.get('SMTP_HOST') || credsMeta.host,
                    port: this.config.get('SMTP_PORT') || credsMeta.port || 587,
                    secure: credsMeta.secure || false,
                    auth: {
                        user: this.config.get('SMTP_USER') || credsMeta.user,
                        pass: this.config.get('SMTP_PASS') || credsMeta.pass,
                    },
                });

            case 'mock':
                return createProvider('mock', credsMeta);

            default:
                throw new Error(`Unsupported provider type: ${providerType}`);
        }
    }
}
