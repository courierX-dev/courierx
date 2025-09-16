import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaService } from '../../src/prisma/prisma.service';
import { SendService } from '../../src/send/send.service';
import { ProvidersRouterService } from '../../src/providers/router.service';
import { WebhooksService } from '../../src/webhooks/webhooks.service';
import { SendGridVerifier } from '../../src/webhooks/verifiers/sendgrid';
import { MailgunVerifier } from '../../src/webhooks/verifiers/mailgun';
import { SESVerifier } from '../../src/webhooks/verifiers/ses';
import { describe, beforeAll, afterAll, beforeEach, it, expect } from 'vitest';

describe('Services Integration Tests', () => {
    let module: TestingModule;
    let prisma: PrismaService;
    let sendService: SendService;
    let routerService: ProvidersRouterService;
    let webhooksService: WebhooksService;

    let tenantId: string;
    let productId: string;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [ConfigModule.forRoot()],
            providers: [
                PrismaService,
                SendService,
                ProvidersRouterService,
                WebhooksService,
                SendGridVerifier,
                MailgunVerifier,
                SESVerifier,
                ConfigService,
            ],
        }).compile();

        prisma = module.get<PrismaService>(PrismaService);
        sendService = module.get<SendService>(SendService);
        routerService = module.get<ProvidersRouterService>(ProvidersRouterService);
        webhooksService = module.get<WebhooksService>(WebhooksService);

        await prisma.$connect();
    });

    afterAll(async () => {
        await prisma.$disconnect();
        await module.close();
    });

    beforeEach(async () => {
        // Clean up test data
        await prisma.event.deleteMany();
        await prisma.message.deleteMany();
        await prisma.suppression.deleteMany();
        await prisma.route.deleteMany();
        await prisma.apiKey.deleteMany();
        await prisma.product.deleteMany();
        await prisma.user.deleteMany();
        await prisma.tenant.deleteMany();
        await prisma.provider.deleteMany();
        await prisma.webhookEvent.deleteMany();

        // Create test tenant and product
        const tenant = await prisma.tenant.create({
            data: {
                name: 'Integration Test Tenant',
                domain: 'integration.test',
                status: 'ACTIVE',
            },
        });
        tenantId = tenant.id;

        const product = await prisma.product.create({
            data: {
                name: 'Integration Test Product',
                tenantId,
                status: 'ACTIVE',
                rateLimitPerHour: 1000,
            },
        });
        productId = product.id;
    });

    describe('Email Sending Integration', () => {
        it('should send email through complete pipeline', async () => {
            const request = {
                to: ['integration@example.com'],
                from: 'sender@integration.test',
                subject: 'Integration Test Email',
                text: 'This is an integration test email',
                html: '<p>This is an integration test email</p>',
            };

            // Send email (will use mock provider since no real providers configured)
            const result = await sendService.send(request, tenantId, productId);

            expect(result.status).toBe('sent');
            expect(result.provider).toBe('mock');
            expect(result.messageId).toBeDefined();

            // Verify message was created in database
            const message = await prisma.message.findUnique({
                where: { id: result.messageId },
            });

            expect(message).toBeDefined();
            expect(message?.tenantId).toBe(tenantId);
            expect(message?.productId).toBe(productId);
            expect(message?.provider).toBe('mock');
            expect(message?.status).toBe('SENT');

            // Verify event was created
            const events = await prisma.event.findMany({
                where: { messageId: result.messageId },
            });

            expect(events).toHaveLength(1);
            expect(events[0].event).toBe('sent');
            expect(events[0].email).toBe('integration@example.com');
        });

        it('should block suppressed emails', async () => {
            const email = 'suppressed@integration.test';

            // Create suppression
            await prisma.suppression.create({
                data: {
                    email,
                    emailHash: 'hashed-suppressed',
                    reason: 'BOUNCE',
                    source: 'MANUAL',
                    tenantId,
                },
            });

            const request = {
                to: [email],
                from: 'sender@integration.test',
                subject: 'Should be blocked',
                text: 'This should not be sent',
            };

            // Attempt to send to suppressed email
            const result = await sendService.send(request, tenantId, productId);

            expect(result.status).toBe('failed');
            expect(result.provider).toBe('suppression');

            // Verify no message was created
            const messages = await prisma.message.findMany({
                where: {
                    tenantId,
                    productId,
                },
            });

            expect(messages).toHaveLength(0);

            // Verify dropped event was created
            const events = await prisma.event.findMany({
                where: {
                    tenantId,
                    productId,
                    event: 'dropped',
                },
            });

            expect(events).toHaveLength(1);
            expect(events[0].email).toBe(email);
        });
    });

    describe('Provider Routing Integration', () => {
        beforeEach(async () => {
            // Create test providers
            const primaryProvider = await prisma.provider.create({
                data: {
                    name: 'test-sendgrid',
                    type: 'SENDGRID',
                    status: 'ACTIVE',
                    priority: 1,
                    config: {
                        apiKey: 'test-sg-key',
                    },
                },
            });

            const secondaryProvider = await prisma.provider.create({
                data: {
                    name: 'test-mock',
                    type: 'MOCK',
                    status: 'ACTIVE',
                    priority: 2,
                    config: {},
                },
            });

            // Create routes
            await prisma.route.create({
                data: {
                    productId,
                    providerId: primaryProvider.id,
                    role: 'PRIMARY',
                    priority: 1,
                    status: 'ACTIVE',
                },
            });

            await prisma.route.create({
                data: {
                    productId,
                    providerId: secondaryProvider.id,
                    role: 'SECONDARY',
                    priority: 2,
                    status: 'ACTIVE',
                },
            });
        });

        it('should route to configured providers', async () => {
            const request = {
                to: ['routing@example.com'],
                from: 'sender@integration.test',
                subject: 'Routing Test',
                text: 'Testing provider routing',
            };

            // Should try SendGrid first, then fallback to mock
            // (SendGrid will fail due to no real API key, so mock should be used)
            const result = await routerService.send(request, productId);

            expect(result.status).toBe('sent');
            expect(result.provider).toBe('mock'); // Fallback provider
        });
    });

    describe('Webhook Processing Integration', () => {
        let messageId: string;

        beforeEach(async () => {
            // Create a test message
            const message = await prisma.message.create({
                data: {
                    id: 'webhook-test-msg',
                    tenantId,
                    productId,
                    provider: 'sendgrid',
                    to: ['webhook@example.com'],
                    from: 'sender@integration.test',
                    subject: 'Webhook Test',
                    status: 'SENT',
                    providerMessageId: 'sg-msg-123',
                },
            });
            messageId = message.id;
        });

        it('should process SendGrid webhook and create suppression', async () => {
            const webhookEvents = [
                {
                    sg_message_id: messageId,
                    event: 'bounce',
                    email: 'bounce@webhook.test',
                    timestamp: Math.floor(Date.now() / 1000),
                    reason: 'mailbox_full',
                    type: 'bounce',
                },
            ];

            // Process webhook
            await webhooksService.processSendGridWebhook(webhookEvents);

            // Verify webhook event was stored
            const storedEvents = await prisma.webhookEvent.findMany({
                where: { provider: 'sendgrid' },
            });

            expect(storedEvents).toHaveLength(1);
            expect(storedEvents[0].eventType).toBe('bounce');

            // Verify suppression was created
            const suppressions = await prisma.suppression.findMany({
                where: {
                    email: 'bounce@webhook.test',
                    tenantId,
                },
            });

            expect(suppressions).toHaveLength(1);
            expect(suppressions[0].reason).toBe('BOUNCE');
            expect(suppressions[0].source).toBe('WEBHOOK_SENDGRID');

            // Verify event was created
            const events = await prisma.event.findMany({
                where: {
                    messageId,
                    event: 'bounce',
                },
            });

            expect(events).toHaveLength(1);
            expect(events[0].email).toBe('bounce@webhook.test');
        });

        it('should process delivery events without creating suppression', async () => {
            const webhookEvents = [
                {
                    sg_message_id: messageId,
                    event: 'delivered',
                    email: 'delivered@webhook.test',
                    timestamp: Math.floor(Date.now() / 1000),
                },
            ];

            // Process webhook
            await webhooksService.processSendGridWebhook(webhookEvents);

            // Verify webhook event was stored
            const storedEvents = await prisma.webhookEvent.findMany({
                where: {
                    provider: 'sendgrid',
                    eventType: 'delivered',
                },
            });

            expect(storedEvents).toHaveLength(1);

            // Verify no suppression was created
            const suppressions = await prisma.suppression.findMany({
                where: {
                    email: 'delivered@webhook.test',
                    tenantId,
                },
            });

            expect(suppressions).toHaveLength(0);

            // Verify delivery event was created
            const events = await prisma.event.findMany({
                where: {
                    messageId,
                    event: 'sent', // delivered maps to sent
                },
            });

            expect(events).toHaveLength(1);
            expect(events[0].email).toBe('delivered@webhook.test');
        });
    });

    describe('Rate Limiting Integration', () => {
        beforeEach(async () => {
            // Update product with low rate limit for testing
            await prisma.product.update({
                where: { id: productId },
                data: { rateLimitPerHour: 3 },
            });
        });

        it('should enforce rate limits across multiple sends', async () => {
            const request = {
                to: ['ratelimit@example.com'],
                from: 'sender@integration.test',
                subject: 'Rate Limit Test',
                text: 'Testing rate limiting',
            };

            // Send 3 emails (at the limit)
            for (let i = 0; i < 3; i++) {
                const result = await sendService.send(
                    { ...request, to: [`ratelimit${i}@example.com`] },
                    tenantId,
                    productId
                );
                expect(result.status).toBe('sent');
            }

            // Verify rate limit usage
            const currentHour = new Date();
            currentHour.setMinutes(0, 0, 0);

            const usage = await prisma.rateUsageHourly.findUnique({
                where: {
                    productId_hour: {
                        productId,
                        hour: currentHour,
                    },
                },
            });

            expect(usage?.count).toBe(3);

            // 4th email should be rate limited (this would be handled by the rate limit interceptor)
            const canSend = await prisma.checkRateLimit(productId, 3);
            expect(canSend).toBe(false);
        });
    });

    describe('End-to-End Email Lifecycle', () => {
        it('should handle complete email lifecycle with webhook', async () => {
            // 1. Send email
            const request = {
                to: ['lifecycle@example.com'],
                from: 'sender@integration.test',
                subject: 'Lifecycle Test',
                text: 'Testing complete email lifecycle',
            };

            const sendResult = await sendService.send(request, tenantId, productId);
            expect(sendResult.status).toBe('sent');

            const messageId = sendResult.messageId;

            // 2. Simulate webhook events for the message
            const deliveredEvent = [
                {
                    sg_message_id: messageId,
                    event: 'delivered',
                    email: 'lifecycle@example.com',
                    timestamp: Math.floor(Date.now() / 1000),
                },
            ];

            await webhooksService.processSendGridWebhook(deliveredEvent);

            // 3. Simulate bounce webhook
            const bounceEvent = [
                {
                    sg_message_id: messageId,
                    event: 'bounce',
                    email: 'lifecycle@example.com',
                    timestamp: Math.floor(Date.now() / 1000) + 60,
                    reason: 'mailbox_full',
                    type: 'bounce',
                },
            ];

            await webhooksService.processSendGridWebhook(bounceEvent);

            // 4. Verify complete lifecycle tracking
            const message = await prisma.message.findUnique({
                where: { id: messageId },
                include: { events: true },
            });

            expect(message).toBeDefined();
            expect(message?.events).toHaveLength(3); // sent, delivered, bounce

            const eventTypes = message?.events.map(e => e.event).sort();
            expect(eventTypes).toEqual(['bounce', 'sent', 'sent']); // delivered maps to sent

            // 5. Verify suppression was created
            const suppression = await prisma.suppression.findFirst({
                where: {
                    email: 'lifecycle@example.com',
                    tenantId,
                },
            });

            expect(suppression).toBeDefined();
            expect(suppression?.reason).toBe('BOUNCE');

            // 6. Verify future sends are blocked
            const blockedResult = await sendService.send(request, tenantId, productId);
            expect(blockedResult.status).toBe('failed');
            expect(blockedResult.provider).toBe('suppression');
        });
    });
});
