import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ProvidersRouterService } from './router.service';
import { PrismaService } from '../prisma/prisma.service';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ProvidersRouterService', () => {
    let service: ProvidersRouterService;
    let mockPrismaService: any;
    let mockConfigService: any;

    beforeEach(async () => {
        mockPrismaService = {
            route: {
                findMany: vi.fn(),
            },
        };

        mockConfigService = {
            get: vi.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProvidersRouterService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: ConfigService, useValue: mockConfigService },
            ],
        }).compile();

        service = module.get<ProvidersRouterService>(ProvidersRouterService);
    });

    describe('send', () => {
        const mockRequest = {
            to: ['test@example.com'],
            from: 'sender@example.com',
            subject: 'Test',
            text: 'Hello',
        };

        const productId = 'product-123';

        it('should use mock provider when no routes configured', async () => {
            // Arrange
            mockPrismaService.route.findMany.mockResolvedValue([]);

            // Act
            const result = await service.send(mockRequest, productId);

            // Assert
            expect(result.provider).toBe('mock');
            expect(result.status).toBe('sent');
        });

        it('should try providers in priority order', async () => {
            // Arrange
            const routes = [
                {
                    provider: {
                        type: 'ses',
                        credsMeta: { region: 'us-east-1' },
                    },
                    role: 'primary',
                    priority: 1,
                },
                {
                    provider: {
                        type: 'mock',
                        credsMeta: {},
                    },
                    role: 'secondary',
                    priority: 2,
                },
            ];

            mockPrismaService.route.findMany.mockResolvedValue(routes);
            mockConfigService.get.mockImplementation((key) => {
                if (key === 'AWS_ACCESS_KEY_ID') return 'test-key';
                if (key === 'AWS_SECRET_ACCESS_KEY') return 'test-secret';
                if (key === 'AWS_REGION') return 'us-east-1';
                return undefined;
            });

            // Act
            const result = await service.send(mockRequest, productId);

            // Assert
            expect(result.provider).toBe('ses');
            expect(mockPrismaService.route.findMany).toHaveBeenCalledWith({
                where: { productId },
                include: { provider: true },
                orderBy: [
                    { role: 'desc' },
                    { priority: 'asc' },
                ],
            });
        });

        it('should failover to secondary provider on primary failure', async () => {
            // Arrange
            const routes = [
                {
                    provider: {
                        type: 'sendgrid',
                        credsMeta: {},
                    },
                    role: 'primary',
                    priority: 1,
                },
                {
                    provider: {
                        type: 'mock',
                        credsMeta: {},
                    },
                    role: 'secondary',
                    priority: 2,
                },
            ];

            mockPrismaService.route.findMany.mockResolvedValue(routes);
            mockConfigService.get.mockReturnValue(undefined); // No SendGrid API key

            // Act
            const result = await service.send(mockRequest, productId);

            // Assert
            expect(result.provider).toBe('mock');
        });

        it('should throw error when all providers fail', async () => {
            // Arrange
            const routes = [
                {
                    provider: {
                        type: 'sendgrid',
                        credsMeta: {},
                    },
                    role: 'primary',
                    priority: 1,
                },
            ];

            mockPrismaService.route.findMany.mockResolvedValue(routes);
            mockConfigService.get.mockReturnValue(undefined); // No API keys

            // Act & Assert
            await expect(service.send(mockRequest, productId)).rejects.toThrow();
        });
    });
});
