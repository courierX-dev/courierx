import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ConfigModule } from '@nestjs/config';
import { describe, beforeAll, afterAll, beforeEach, it, expect } from 'vitest';

describe('Database Integration Tests', () => {
    let prisma: PrismaService;
    let module: TestingModule;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [ConfigModule.forRoot()],
            providers: [PrismaService],
        }).compile();

        prisma = module.get<PrismaService>(PrismaService);
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
    });

    describe('Tenant and Product Management', () => {
        it('should create tenant with product and API key', async () => {
            // Create tenant
            const tenant = await prisma.tenant.create({
                data: {
                    name: 'Test Tenant',
                    domain: 'test.com',
                    status: 'ACTIVE',
                },
            });

            expect(tenant.id).toBeDefined();
            expect(tenant.name).toBe('Test Tenant');

            // Create user
            const user = await prisma.user.create({
                data: {
                    email: 'test@test.com',
                    name: 'Test User',
                    tenantId: tenant.id,
                    role: 'ADMIN',
                    status: 'ACTIVE',
                },
            });

            // Create product
            const product = await prisma.product.create({
                data: {
                    name: 'Test Product',
                    tenantId: tenant.id,
                    status: 'ACTIVE',
                    rateLimitPerHour: 1000,
                },
            });

            expect(product.tenantId).toBe(tenant.id);

            // Create API key
            const apiKey = await prisma.apiKey.create({
                data: {
                    key: 'test-key-123',
                    keyHash: Buffer.from('hashed-key'),
                    name: 'Test API Key',
                    productId: product.id,
                    status: 'ACTIVE',
                    permissions: ['SEND_EMAIL'],
                },
            });

            expect(apiKey.productId).toBe(product.id);

            // Verify relationships
            const productWithRelations = await prisma.product.findUnique({
                where: { id: product.id },
                include: {
                    tenant: true,
                    apiKeys: true,
                },
            });

            expect(productWithRelations?.tenant.name).toBe('Test Tenant');
            expect(productWithRelations?.apiKeys).toHaveLength(1);
        });
    });

    describe('Email Suppression System', () => {
        let tenantId: string;
        let productId: string;

        beforeEach(async () => {
            const tenant = await prisma.tenant.create({
                data: {
                    name: 'Test Tenant',
                    domain: 'test.com',
                    status: 'ACTIVE',
                },
            });
            tenantId = tenant.id;

            const product = await prisma.product.create({
                data: {
                    name: 'Test Product',
                    tenantId,
                    status: 'ACTIVE',
                    rateLimitPerHour: 1000,
                },
            });
            productId = product.id;
        });

        it('should create and check email suppression', async () => {
            const email = 'suppressed@example.com';

            // Create suppression
            await prisma.suppression.create({
                data: {
                    email,
                    emailHash: 'hashed-email',
                    reason: 'BOUNCE',
                    source: 'WEBHOOK',
                    tenantId,
                },
            });

            // Check suppression using the helper function
            const isSupressed = await prisma.isEmailSuppressed(productId, email);
            expect(isSupressed).toBe(true);

            // Check non-suppressed email
            const isNotSuppressed = await prisma.isEmailSuppressed(productId, 'clean@example.com');
            expect(isNotSuppressed).toBe(false);
        });

        it('should handle global vs product-specific suppression', async () => {
            const email = 'global@example.com';

            // Create global suppression (no productId)
            await prisma.suppression.create({
                data: {
                    email,
                    emailHash: 'hashed-global',
                    reason: 'COMPLAINT',
                    source: 'MANUAL',
                    tenantId,
                },
            });

            // Should be suppressed for any product in the tenant
            const isSupressed = await prisma.isEmailSuppressed(productId, email);
            expect(isSupressed).toBe(true);
        });
    });

    describe('Provider Routing System', () => {
        let productId: string;

        beforeEach(async () => {
            const tenant = await prisma.tenant.create({
                data: {
                    name: 'Test Tenant',
                    domain: 'test.com',
                    status: 'ACTIVE',
                },
            });

            const product = await prisma.product.create({
                data: {
                    name: 'Test Product',
                    tenantId: tenant.id,
                    status: 'ACTIVE',
                    rateLimitPerHour: 1000,
                },
            });
            productId = product.id;
        });

        it('should create provider routing configuration', async () => {
            // Create providers
            const primaryProvider = await prisma.provider.create({
                data: {
                    name: 'sendgrid-primary',
                    type: 'SENDGRID',
                    status: 'ACTIVE',
                    priority: 1,
                    config: {
                        apiKey: 'sg-key-123',
                    },
                },
            });

            const secondaryProvider = await prisma.provider.create({
                data: {
                    name: 'mailgun-secondary',
                    type: 'MAILGUN',
                    status: 'ACTIVE',
                    priority: 2,
                    config: {
                        apiKey: 'mg-key-456',
                        domain: 'mg.example.com',
                    },
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

            // Fetch routes with providers
            const routes = await prisma.route.findMany({
                where: { productId },
                include: { provider: true },
                orderBy: [
                    { role: 'desc' },
                    { priority: 'asc' },
                ],
            });

            expect(routes).toHaveLength(2);
            expect(routes[0].role).toBe('PRIMARY');
            expect(routes[0].provider.type).toBe('SENDGRID');
            expect(routes[1].role).toBe('SECONDARY');
            expect(routes[1].provider.type).toBe('MAILGUN');
        });
    });

    describe('Message and Event Tracking', () => {
        let tenantId: string;
        let productId: string;

        beforeEach(async () => {
            const tenant = await prisma.tenant.create({
                data: {
                    name: 'Test Tenant',
                    domain: 'test.com',
                    status: 'ACTIVE',
                },
            });
            tenantId = tenant.id;

            const product = await prisma.product.create({
                data: {
                    name: 'Test Product',
                    tenantId,
                    status: 'ACTIVE',
                    rateLimitPerHour: 1000,
                },
            });
            productId = product.id;
        });

        it('should track complete email lifecycle', async () => {
            // Create message
            const message = await prisma.message.create({
                data: {
                    id: 'msg-123',
                    tenantId,
                    productId,
                    provider: 'sendgrid',
                    to: ['recipient@example.com'],
                    from: 'sender@example.com',
                    subject: 'Test Email',
                    status: 'SENT',
                    providerMessageId: 'sg-msg-456',
                },
            });

            expect(message.id).toBe('msg-123');

            // Create events for the message
            const sentEvent = await prisma.event.create({
                data: {
                    messageId: message.id,
                    tenantId,
                    productId,
                    event: 'sent',
                    email: 'recipient@example.com',
                    provider: 'sendgrid',
                    providerEventId: 'sg-event-123',
                },
            });

            const deliveredEvent = await prisma.event.create({
                data: {
                    messageId: message.id,
                    tenantId,
                    productId,
                    event: 'delivered',
                    email: 'recipient@example.com',
                    provider: 'sendgrid',
                    providerEventId: 'sg-event-124',
                },
            });

            // Verify event tracking
            const events = await prisma.event.findMany({
                where: { messageId: message.id },
                orderBy: { createdAt: 'asc' },
            });

            expect(events).toHaveLength(2);
            expect(events[0].event).toBe('sent');
            expect(events[1].event).toBe('delivered');
        });
    });

    describe('Rate Limiting System', () => {
        let productId: string;

        beforeEach(async () => {
            const tenant = await prisma.tenant.create({
                data: {
                    name: 'Test Tenant',
                    domain: 'test.com',
                    status: 'ACTIVE',
                },
            });

            const product = await prisma.product.create({
                data: {
                    name: 'Test Product',
                    tenantId: tenant.id,
                    status: 'ACTIVE',
                    rateLimitPerHour: 10, // Low limit for testing
                },
            });
            productId = product.id;
        });

        it('should track and enforce rate limits', async () => {
            // Simulate multiple sends within the same hour
            for (let i = 0; i < 5; i++) {
                await prisma.bumpHourlyUsage(productId);
            }

            // Check current usage
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

            expect(usage?.count).toBe(5);

            // Test rate limit checking
            const canSend = await prisma.checkRateLimit(productId, 10);
            expect(canSend).toBe(true);

            const cannotSend = await prisma.checkRateLimit(productId, 5);
            expect(cannotSend).toBe(false);
        });
    });

    describe('Webhook Event Processing', () => {
        let tenantId: string;
        let productId: string;
        let messageId: string;

        beforeEach(async () => {
            const tenant = await prisma.tenant.create({
                data: {
                    name: 'Test Tenant',
                    domain: 'test.com',
                    status: 'ACTIVE',
                },
            });
            tenantId = tenant.id;

            const product = await prisma.product.create({
                data: {
                    name: 'Test Product',
                    tenantId,
                    status: 'ACTIVE',
                    rateLimitPerHour: 1000,
                },
            });
            productId = product.id;

            const message = await prisma.message.create({
                data: {
                    id: 'msg-webhook-test',
                    tenantId,
                    productId,
                    provider: 'sendgrid',
                    to: ['webhook@example.com'],
                    from: 'sender@example.com',
                    subject: 'Webhook Test',
                    status: 'SENT',
                },
            });
            messageId = message.id;
        });

        it('should process webhook events and create suppressions', async () => {
            const email = 'bounce@example.com';

            // Create webhook event
            const webhookEvent = await prisma.webhookEvent.create({
                data: {
                    provider: 'sendgrid',
                    eventType: 'bounce',
                    payload: {
                        sg_message_id: messageId,
                        event: 'bounce',
                        email,
                        reason: 'mailbox_full',
                    },
                    processed: false,
                },
            });

            expect(webhookEvent.id).toBeDefined();

            // Simulate webhook processing - create suppression
            await prisma.suppressEmail(tenantId, productId, email, 'bounce', 'webhook_sendgrid');

            // Verify suppression was created
            const suppression = await prisma.suppression.findFirst({
                where: {
                    email,
                    tenantId,
                },
            });

            expect(suppression).toBeDefined();
            expect(suppression?.reason).toBe('BOUNCE');
            expect(suppression?.source).toBe('WEBHOOK_SENDGRID');

            // Mark webhook as processed
            await prisma.webhookEvent.update({
                where: { id: webhookEvent.id },
                data: { processed: true },
            });

            const processedEvent = await prisma.webhookEvent.findUnique({
                where: { id: webhookEvent.id },
            });

            expect(processedEvent?.processed).toBe(true);
        });
    });
});
