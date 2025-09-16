import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksService } from './webhooks.service';
import { PrismaService } from '../prisma/prisma.service';
import { SendGridVerifier } from './verifiers/sendgrid';
import { MailgunVerifier } from './verifiers/mailgun';
import { SESVerifier } from './verifiers/ses';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('WebhooksService', () => {
    let service: WebhooksService;
    let mockPrismaService: any;

    beforeEach(async () => {
        mockPrismaService = {
            webhookEvent: {
                create: vi.fn(),
            },
            message: {
                findUnique: vi.fn(),
            },
            event: {
                create: vi.fn(),
            },
            suppressEmail: vi.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WebhooksService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: SendGridVerifier, useValue: {} },
                { provide: MailgunVerifier, useValue: {} },
                { provide: SESVerifier, useValue: {} },
            ],
        }).compile();

        service = module.get<WebhooksService>(WebhooksService);
    });

    describe('processSendGridWebhook', () => {
        it('should process delivery events', async () => {
            // Arrange
            const events = [
                {
                    sg_message_id: 'msg-123',
                    event: 'delivered',
                    email: 'test@example.com',
                    timestamp: 1758000000,
                },
            ];

            mockPrismaService.message.findUnique.mockResolvedValue({
                id: 'msg-123',
                tenantId: 'tenant-123',
                productId: 'product-123',
            });

            // Act
            await service.processSendGridWebhook(events);

            // Assert
            expect(mockPrismaService.webhookEvent.create).toHaveBeenCalled();
            expect(mockPrismaService.event.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    event: 'sent',
                    email: 'test@example.com',
                }),
            });
        });

        it('should create suppression on bounce events', async () => {
            // Arrange
            const events = [
                {
                    sg_message_id: 'msg-123',
                    event: 'bounce',
                    email: 'bounce@example.com',
                    timestamp: 1758000000,
                },
            ];

            mockPrismaService.message.findUnique.mockResolvedValue({
                id: 'msg-123',
                tenantId: 'tenant-123',
                productId: 'product-123',
            });

            // Act
            await service.processSendGridWebhook(events);

            // Assert
            expect(mockPrismaService.suppressEmail).toHaveBeenCalledWith(
                'tenant-123',
                'product-123',
                'bounce@example.com',
                'bounce',
                'webhook_sendgrid'
            );
        });

        it('should handle missing message gracefully', async () => {
            // Arrange
            const events = [
                {
                    sg_message_id: 'nonexistent-msg',
                    event: 'delivered',
                    email: 'test@example.com',
                    timestamp: 1758000000,
                },
            ];

            mockPrismaService.message.findUnique.mockResolvedValue(null);

            // Act
            await service.processSendGridWebhook(events);

            // Assert
            expect(mockPrismaService.webhookEvent.create).toHaveBeenCalled();
            expect(mockPrismaService.event.create).not.toHaveBeenCalled();
        });

        it('should skip incomplete events', async () => {
            // Arrange
            const events = [
                {
                    // Missing required fields
                    event: 'delivered',
                    timestamp: 1758000000,
                },
            ];

            // Act
            await service.processSendGridWebhook(events);

            // Assert
            expect(mockPrismaService.webhookEvent.create).not.toHaveBeenCalled();
        });
    });
});
