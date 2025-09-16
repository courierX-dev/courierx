import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SendGridVerifier } from './verifiers/sendgrid';
import { MailgunVerifier } from './verifiers/mailgun';
import { SESVerifier } from './verifiers/ses';

@Injectable()
export class WebhooksService {
    private readonly logger = new Logger(WebhooksService.name);

    constructor(
        private prisma: PrismaService,
        private sendGridVerifier: SendGridVerifier,
        private mailgunVerifier: MailgunVerifier,
        private sesVerifier: SESVerifier
    ) { }

    async processSendGridWebhook(events: any[], signature?: string): Promise<void> {
        this.logger.log(`Processing ${events.length} SendGrid events`);

        for (const event of events) {
            try {
                await this.storeWebhookEvent({
                    messageId: event.sg_message_id || event['smtp-id'],
                    type: this.mapSendGridEventType(event.event),
                    recipient: event.email,
                    timestamp: new Date(event.timestamp * 1000),
                    metadata: event,
                }, 'sendgrid');
            } catch (error) {
                this.logger.error('Failed to process SendGrid event:', error);
            }
        }
    }

    async processMailgunWebhook(event: any, headers: any): Promise<void> {
        this.logger.log('Processing Mailgun webhook event');

        try {
            await this.storeWebhookEvent({
                messageId: event['message-id'],
                type: this.mapMailgunEventType(event.event),
                recipient: event.recipient,
                timestamp: new Date(event.timestamp * 1000),
                metadata: event,
            }, 'mailgun');
        } catch (error) {
            this.logger.error('Failed to process Mailgun event:', error);
        }
    }

    async processSESWebhook(notification: any, messageType?: string): Promise<void> {
        this.logger.log('Processing SES webhook notification');

        try {
            const message = JSON.parse(notification.Message || '{}');

            await this.storeWebhookEvent({
                messageId: message.mail?.messageId,
                type: this.mapSESEventType(message.eventType || message.notificationType),
                recipient: message.mail?.destination?.[0] || message.bounce?.bouncedRecipients?.[0]?.emailAddress,
                timestamp: new Date(message.mail?.timestamp || Date.now()),
                metadata: message,
            }, 'ses');
        } catch (error) {
            this.logger.error('Failed to process SES event:', error);
        }
    }

    private async storeWebhookEvent(event: {
        messageId: string;
        type: string;
        recipient: string;
        timestamp: Date;
        metadata: any;
    }, provider: string): Promise<void> {
        if (!event.messageId || !event.type || !event.recipient) {
            this.logger.warn('Skipping incomplete webhook event');
            return;
        }

        // Store raw webhook event
        await this.prisma.webhookEvent.create({
            data: {
                provider: provider as any, // Cast to enum
                payload: {
                    messageId: event.messageId,
                    type: event.type,
                    recipient: event.recipient,
                    timestamp: event.timestamp,
                    metadata: event.metadata,
                },
            },
        });

        // Find the message to get tenant and product info
        const message = await this.prisma.message.findUnique({
            where: { id: event.messageId },
            include: { tenant: true, product: true },
        });

        if (message) {
            // Create normalized event
            await this.prisma.event.create({
                data: {
                    tenantId: message.tenantId,
                    productId: message.productId,
                    messageId: event.messageId,
                    email: event.recipient,
                    event: this.normalizeEventType(event.type),
                    provider: provider as any,
                    metaJson: event.metadata,
                },
            });

            // Handle suppression for bounces and complaints
            if (event.type === 'bounced' || event.type === 'complained') {
                await this.prisma.suppressEmail(
                    message.tenantId,
                    message.productId,
                    event.recipient,
                    event.type === 'bounced' ? 'bounce' : 'complaint',
                    `webhook_${provider}`
                );

                this.logger.log(`Added ${event.recipient} to suppression list due to ${event.type}`);
            }
        } else {
            this.logger.warn(`Message ${event.messageId} not found for webhook event`);
        }
    }

    private normalizeEventType(type: string): any {
        const mapping: Record<string, string> = {
            delivered: 'sent',
            bounced: 'bounce',
            complained: 'complaint',
            clicked: 'click',
            opened: 'open',
        };
        return mapping[type] || type;
    }

    private mapSendGridEventType(eventType: string): string {
        const mapping: Record<string, string> = {
            delivered: 'delivered',
            bounce: 'bounced',
            dropped: 'bounced',
            spamreport: 'complained',
            click: 'clicked',
            open: 'opened',
        };
        return mapping[eventType] || eventType;
    }

    private mapMailgunEventType(eventType: string): string {
        const mapping: Record<string, string> = {
            delivered: 'delivered',
            failed: 'bounced',
            complained: 'complained',
            clicked: 'clicked',
            opened: 'opened',
        };
        return mapping[eventType] || eventType;
    }

    private mapSESEventType(eventType: string): string {
        const mapping: Record<string, string> = {
            delivery: 'delivered',
            bounce: 'bounced',
            complaint: 'complained',
            click: 'clicked',
            open: 'opened',
        };
        return mapping[eventType] || eventType;
    }
}
