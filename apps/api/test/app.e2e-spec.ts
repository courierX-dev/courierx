import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { describe, beforeAll, afterAll, it, expect } from 'vitest';

describe('CourierX API (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let apiKey: string;
    let tenantId: string;
    let productId: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        prisma = moduleFixture.get<PrismaService>(PrismaService);
        await app.init();

        // Create test tenant and product
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

        const apiKeyRecord = await prisma.apiKey.create({
            data: {
                key: 'test-api-key-123',
                name: 'Test API Key',
                productId,
                status: 'ACTIVE',
                permissions: ['SEND_EMAIL'],
            },
        });
        apiKey = apiKeyRecord.key;

        // Create test provider
        await prisma.provider.create({
            data: {
                name: 'test-provider',
                type: 'SMTP',
                status: 'ACTIVE',
                priority: 1,
                config: {
                    host: 'smtp.test.com',
                    port: 587,
                    username: 'test',
                    password: 'test',
                },
            },
        });
    });

    afterAll(async () => {
        await prisma.event.deleteMany();
        await prisma.suppression.deleteMany();
        await prisma.apiKey.deleteMany();
        await prisma.product.deleteMany();
        await prisma.tenant.deleteMany();
        await prisma.provider.deleteMany();
        await app.close();
    });

    describe('/health (GET)', () => {
        it('should return health status', () => {
            return request(app.getHttpServer())
                .get('/health')
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('status', 'ok');
                    expect(res.body).toHaveProperty('timestamp');
                    expect(res.body).toHaveProperty('uptime');
                });
        });
    });

    describe('/send (POST)', () => {
        it('should send email successfully', () => {
            return request(app.getHttpServer())
                .post('/send')
                .set('Authorization', `Bearer ${apiKey}`)
                .send({
                    to: 'test@example.com',
                    subject: 'Test Email',
                    html: '<p>Test content</p>',
                })
                .expect(201)
                .expect((res) => {
                    expect(res.body).toHaveProperty('messageId');
                    expect(res.body).toHaveProperty('status', 'sent');
                });
        });

        it('should reject invalid API key', () => {
            return request(app.getHttpServer())
                .post('/send')
                .set('Authorization', 'Bearer invalid-key')
                .send({
                    to: 'test@example.com',
                    subject: 'Test Email',
                    html: '<p>Test content</p>',
                })
                .expect(401);
        });

        it('should reject missing required fields', () => {
            return request(app.getHttpServer())
                .post('/send')
                .set('Authorization', `Bearer ${apiKey}`)
                .send({
                    subject: 'Test Email',
                    html: '<p>Test content</p>',
                })
                .expect(400);
        });

        it('should reject suppressed email', async () => {
            // Create suppression
            await prisma.suppression.create({
                data: {
                    emailHash: 'suppressed-hash',
                    email: 'suppressed@example.com',
                    reason: 'BOUNCE',
                    source: 'WEBHOOK',
                    tenantId,
                },
            });

            return request(app.getHttpServer())
                .post('/send')
                .set('Authorization', `Bearer ${apiKey}`)
                .send({
                    to: 'suppressed@example.com',
                    subject: 'Test Email',
                    html: '<p>Test content</p>',
                })
                .expect(400)
                .expect((res) => {
                    expect(res.body.message).toContain('suppressed');
                });
        });
    });

    describe('/webhooks/:provider (POST)', () => {
        it('should process bounce webhook', () => {
            return request(app.getHttpServer())
                .post('/webhooks/test-provider')
                .send({
                    type: 'bounce',
                    email: 'bounce@example.com',
                    reason: 'mailbox_full',
                })
                .expect(200);
        });

        it('should process complaint webhook', () => {
            return request(app.getHttpServer())
                .post('/webhooks/test-provider')
                .send({
                    type: 'complaint',
                    email: 'complaint@example.com',
                    reason: 'spam',
                })
                .expect(200);
        });
    });

    describe('Rate Limiting', () => {
        it('should enforce rate limits', async () => {
            // Create product with low rate limit
            const limitedProduct = await prisma.product.create({
                data: {
                    name: 'Limited Product',
                    tenantId,
                    status: 'ACTIVE',
                    rateLimitPerHour: 1,
                },
            });

            const limitedApiKey = await prisma.apiKey.create({
                data: {
                    key: 'limited-api-key',
                    name: 'Limited API Key',
                    productId: limitedProduct.id,
                    status: 'ACTIVE',
                    permissions: ['SEND_EMAIL'],
                },
            });

            // First request should succeed
            await request(app.getHttpServer())
                .post('/send')
                .set('Authorization', `Bearer ${limitedApiKey.key}`)
                .send({
                    to: 'test1@example.com',
                    subject: 'Test Email 1',
                    html: '<p>Test content</p>',
                })
                .expect(201);

            // Second request should be rate limited
            return request(app.getHttpServer())
                .post('/send')
                .set('Authorization', `Bearer ${limitedApiKey.key}`)
                .send({
                    to: 'test2@example.com',
                    subject: 'Test Email 2',
                    html: '<p>Test content</p>',
                })
                .expect(429);
        });
    });
});
