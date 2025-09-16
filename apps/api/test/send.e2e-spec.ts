import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Send API (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let apiKey: string;
    let productId: string;
    let tenantId: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication<NestFastifyApplication>(
            new FastifyAdapter()
        );

        prisma = moduleFixture.get<PrismaService>(PrismaService);

        await app.init();
        await app.getHttpAdapter().getInstance().ready();

        // Create test data
        const tenant = await prisma.tenant.create({
            data: {
                name: 'E2E Test Tenant',
                plan: 'free',
            },
        });
        tenantId = tenant.id;

        const product = await prisma.product.create({
            data: {
                tenantId: tenant.id,
                name: 'E2E Test Product',
                slug: 'e2e-test',
                defaultFrom: 'test@example.com',
                ratePerHour: 10, // Low limit for testing
            },
        });
        productId = product.id;

        // Create API key
        const keyHash = require('crypto').createHash('sha256').update('test-api-key').digest();
        await prisma.apiKey.create({
            data: {
                productId: product.id,
                name: 'e2e-test',
                keyHash,
                active: true,
            },
        });
        apiKey = 'test-api-key';

        // Create mock provider route
        const provider = await prisma.providerAccount.create({
            data: {
                tenantId: tenant.id,
                type: 'mock',
                enabled: true,
            },
        });

        await prisma.route.create({
            data: {
                productId: product.id,
                providerId: provider.id,
                role: 'primary',
                priority: 1,
            },
        });
    });

    afterAll(async () => {
        // Cleanup
        await prisma.suppression.deleteMany({ where: { tenantId } });
        await prisma.event.deleteMany({ where: { tenantId } });
        await prisma.message.deleteMany({ where: { tenantId } });
        await prisma.rateUsageHourly.deleteMany({ where: { productId } });
        await prisma.route.deleteMany({ where: { productId } });
        await prisma.providerAccount.deleteMany({ where: { tenantId } });
        await prisma.apiKey.deleteMany({ where: { productId } });
        await prisma.product.deleteMany({ where: { tenantId } });
        await prisma.tenant.deleteMany({ where: { id: tenantId } });

        await app.close();
    });

    describe('/v1/send (POST)', () => {
        it('should send email successfully', () => {
            return request(app.getHttpServer())
                .post('/v1/send')
                .set('Authorization', `Bearer ${apiKey}`)
                .send({
                    to: ['success@example.com'],
                    from: 'sender@example.com',
                    subject: 'E2E Test',
                    text: 'Hello from E2E test',
                })
                .expect(201)
                .expect((res) => {
                    expect(res.body.status).toBe('sent');
                    expect(res.body.provider).toBe('mock');
                    expect(res.body.id).toMatch(/^mock_/);
                });
        });

        it('should reject invalid API key', () => {
            return request(app.getHttpServer())
                .post('/v1/send')
                .set('Authorization', 'Bearer invalid-key')
                .send({
                    to: ['test@example.com'],
                    from: 'sender@example.com',
                    subject: 'Test',
                    text: 'Hello',
                })
                .expect(401);
        });

        it('should reject missing API key', () => {
            return request(app.getHttpServer())
                .post('/v1/send')
                .send({
                    to: ['test@example.com'],
                    from: 'sender@example.com',
                    subject: 'Test',
                    text: 'Hello',
                })
                .expect(401);
        });

        it('should reject invalid email format', () => {
            return request(app.getHttpServer())
                .post('/v1/send')
                .set('Authorization', `Bearer ${apiKey}`)
                .send({
                    to: ['invalid-email'],
                    from: 'sender@example.com',
                    subject: 'Test',
                    text: 'Hello',
                })
                .expect(400);
        });

        it('should block suppressed emails', async () => {
            // First, add email to suppression
            await prisma.suppressEmail(
                tenantId,
                productId,
                'suppressed@example.com',
                'bounce',
                'e2e-test'
            );

            return request(app.getHttpServer())
                .post('/v1/send')
                .set('Authorization', `Bearer ${apiKey}`)
                .send({
                    to: ['suppressed@example.com'],
                    from: 'sender@example.com',
                    subject: 'Should be blocked',
                    text: 'Hello',
                })
                .expect(201)
                .expect((res) => {
                    expect(res.body.status).toBe('failed');
                    expect(res.body.provider).toBe('suppression');
                });
        });

        it('should enforce rate limits', async () => {
            // Send emails up to the limit (10 per hour)
            const promises = [];
            for (let i = 0; i < 12; i++) {
                promises.push(
                    request(app.getHttpServer())
                        .post('/v1/send')
                        .set('Authorization', `Bearer ${apiKey}`)
                        .send({
                            to: [`rate-test-${i}@example.com`],
                            from: 'sender@example.com',
                            subject: `Rate Test ${i}`,
                            text: 'Hello',
                        })
                );
            }

            const responses = await Promise.all(promises);

            // First 10 should succeed
            const successful = responses.filter(r => r.status === 201);
            const rateLimited = responses.filter(r => r.status === 429);

            expect(successful.length).toBeGreaterThanOrEqual(10);
            expect(rateLimited.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('/v1/me (GET)', () => {
        it('should return product and tenant info', () => {
            return request(app.getHttpServer())
                .get('/v1/me')
                .set('Authorization', `Bearer ${apiKey}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body.productId).toBe(productId);
                    expect(res.body.tenantId).toBe(tenantId);
                    expect(res.body.productName).toBe('E2E Test Product');
                });
        });
    });

    describe('/webhooks/sendgrid (POST)', () => {
        it('should process webhook and create suppression on bounce', async () => {
            // First send an email to get a message ID
            const sendResponse = await request(app.getHttpServer())
                .post('/v1/send')
                .set('Authorization', `Bearer ${apiKey}`)
                .send({
                    to: ['webhook-bounce@example.com'],
                    from: 'sender@example.com',
                    subject: 'Webhook Test',
                    text: 'Hello',
                });

            const messageId = sendResponse.body.id;

            // Send bounce webhook
            await request(app.getHttpServer())
                .post('/webhooks/sendgrid')
                .send([
                    {
                        sg_message_id: messageId,
                        event: 'bounce',
                        email: 'webhook-bounce@example.com',
                        timestamp: Math.floor(Date.now() / 1000),
                    },
                ])
                .expect(201);

            // Verify suppression was created
            const suppression = await prisma.suppression.findFirst({
                where: {
                    email: 'webhook-bounce@example.com',
                    productId,
                },
            });

            expect(suppression).toBeTruthy();
            expect(suppression?.reason).toBe('bounce');
            expect(suppression?.source).toBe('webhook_sendgrid');

            // Verify future sends are blocked
            const blockedResponse = await request(app.getHttpServer())
                .post('/v1/send')
                .set('Authorization', `Bearer ${apiKey}`)
                .send({
                    to: ['webhook-bounce@example.com'],
                    from: 'sender@example.com',
                    subject: 'Should be blocked',
                    text: 'Hello',
                });

            expect(blockedResponse.body.status).toBe('failed');
            expect(blockedResponse.body.provider).toBe('suppression');
        });
    });
});
