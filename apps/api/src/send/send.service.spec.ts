import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SendService } from './send.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProvidersRouterService } from '../providers/router.service';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('SendService', () => {
    let service: SendService;
    let mockPrismaService: any;
    let mockRouterService: any;

    beforeEach(async () => {
        mockPrismaService = {
            isEmailSuppressed: vi.fn(),
            event: {
                create: vi.fn(),
            },
            message: {
                create: vi.fn(),
            },
            bumpHourlyUsage: vi.fn(),
        };

        mockRouterService = {
            send: vi.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SendService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: ProvidersRouterService, useValue: mockRouterService },
            ],
        }).compile();

        service = module.get<SendService>(SendService);
    });

    describe('send', () => {
        const validRequest = {
            to: ['test@example.com'],
            from: 'sender@example.com',
            subject: 'Test',
            text: 'Hello World',
        };

        const tenantId = 'tenant-123';
        const productId = 'product-456';

        it('should send email successfully', async () => {
            // Arrange
            mockPrismaService.isEmailSuppressed.mockResolvedValue(false);
            mockRouterService.send.mockResolvedValue({
                id: 'msg-123',
                status: 'sent',
                provider: 'mock',
                timestamp: '2025-09-16T10:00:00.000Z',
            });
            mockPrismaService.message.create.mockResolvedValue({});
            mockPrismaService.event.create.mockResolvedValue({});
            mockPrismaService.bumpHourlyUsage.mockResolvedValue();

            // Act
            const result = await service.send(validRequest, tenantId, productId);

            // Assert
            expect(result.status).toBe('sent');
            expect(result.provider).toBe('mock');
            expect(mockPrismaService.isEmailSuppressed).toHaveBeenCalledWith(productId, 'test@example.com');
            expect(mockRouterService.send).toHaveBeenCalledWith(validRequest, productId);
            expect(mockPrismaService.bumpHourlyUsage).toHaveBeenCalledWith(productId);
        });

        it('should block suppressed emails', async () => {
            // Arrange
            mockPrismaService.isEmailSuppressed.mockResolvedValue(true);
            mockPrismaService.event.create.mockResolvedValue({});

            // Act
            const result = await service.send(validRequest, tenantId, productId);

            // Assert
            expect(result.status).toBe('failed');
            expect(result.provider).toBe('suppression');
            expect(mockRouterService.send).not.toHaveBeenCalled();
            expect(mockPrismaService.event.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    event: 'dropped',
                    email: 'test@example.com',
                }),
            });
        });

        it('should handle provider failures', async () => {
            // Arrange
            mockPrismaService.isEmailSuppressed.mockResolvedValue(false);
            mockRouterService.send.mockRejectedValue(new Error('Provider failed'));
            mockPrismaService.message.create.mockResolvedValue({ id: 'failed-123' });
            mockPrismaService.event.create.mockResolvedValue({});

            // Act & Assert
            await expect(service.send(validRequest, tenantId, productId)).rejects.toThrow(BadRequestException);
            expect(mockPrismaService.message.create).toHaveBeenCalled();
            expect(mockPrismaService.event.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    event: 'dropped',
                }),
            });
        });

        it('should validate request format', async () => {
            // Arrange
            const invalidRequest = {
                to: [], // Empty recipients
                from: 'sender@example.com',
                subject: 'Test',
            };

            // Act & Assert
            await expect(service.send(invalidRequest as any, tenantId, productId)).rejects.toThrow();
        });
    });
});
