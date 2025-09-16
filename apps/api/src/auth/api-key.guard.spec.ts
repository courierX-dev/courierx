import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';
import { PrismaService } from '../prisma/prisma.service';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ApiKeyGuard', () => {
    let guard: ApiKeyGuard;
    let mockPrismaService: any;

    beforeEach(async () => {
        mockPrismaService = {
            apiKey: {
                findFirst: vi.fn(),
            },
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ApiKeyGuard,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        guard = module.get<ApiKeyGuard>(ApiKeyGuard);
    });

    const createMockContext = (headers: Record<string, string>): ExecutionContext => {
        const mockRequest = { headers };
        return {
            switchToHttp: () => ({
                getRequest: () => mockRequest,
            }),
        } as ExecutionContext;
    };

    describe('canActivate', () => {
        it('should allow valid API key with Authorization header', async () => {
            // Arrange
            const context = createMockContext({
                authorization: 'Bearer valid-api-key',
            });

            mockPrismaService.apiKey.findFirst.mockResolvedValue({
                id: 'key-123',
                product: {
                    id: 'product-123',
                    name: 'Test Product',
                    tenant: {
                        id: 'tenant-123',
                        name: 'Test Tenant',
                    },
                },
            });

            // Act
            const result = await guard.canActivate(context);

            // Assert
            expect(result).toBe(true);
            expect(mockPrismaService.apiKey.findFirst).toHaveBeenCalledWith({
                where: {
                    keyHash: expect.any(Buffer),
                    active: true,
                },
                include: {
                    product: {
                        include: {
                            tenant: true,
                        },
                    },
                },
            });
        });

        it('should allow valid API key with x-api-key header', async () => {
            // Arrange
            const context = createMockContext({
                'x-api-key': 'valid-api-key',
            });

            mockPrismaService.apiKey.findFirst.mockResolvedValue({
                id: 'key-123',
                product: {
                    id: 'product-123',
                    tenant: { id: 'tenant-123' },
                },
            });

            // Act
            const result = await guard.canActivate(context);

            // Assert
            expect(result).toBe(true);
        });

        it('should reject missing API key', async () => {
            // Arrange
            const context = createMockContext({});

            // Act & Assert
            await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
        });

        it('should reject invalid API key', async () => {
            // Arrange
            const context = createMockContext({
                authorization: 'Bearer invalid-key',
            });

            mockPrismaService.apiKey.findFirst.mockResolvedValue(null);

            // Act & Assert
            await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
        });

        it('should reject malformed Authorization header', async () => {
            // Arrange
            const context = createMockContext({
                authorization: 'InvalidFormat',
            });

            // Act & Assert
            await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
        });
    });
});
