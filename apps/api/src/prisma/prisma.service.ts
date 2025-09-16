import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createPIIMiddleware } from './pii.middleware';
import { createHash } from 'crypto';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor() {
        super({
            // Connection pooling configuration for scalability
            datasources: {
                db: {
                    url: process.env.DATABASE_URL,
                },
            },
            // Enable query logging in development
            log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        });
    }

    async onModuleInit() {
        // Add PII middleware for automatic email normalization and hashing
        this.$use(createPIIMiddleware());

        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }

    /**
     * Helper function to bump hourly usage for rate limiting
     */
    async bumpHourlyUsage(productId: string): Promise<void> {
        await this.$executeRaw`SELECT bump_hourly_usage(${productId}::uuid)`;
    }

    /**
     * Helper function to check if email is suppressed
     * Optimized for high concurrency with indexed query
     */
    async isEmailSuppressed(productId: string, email: string): Promise<boolean> {
        const emailNorm = email.toLowerCase().trim();
        const emailHash = createHash('sha256').update(emailNorm).digest();

        // Use indexed query for better performance
        const suppression = await this.suppression.findFirst({
            where: {
                emailHash,
                OR: [
                    { productId },
                    { productId: null }, // Global suppression
                ],
            },
            select: { id: true }, // Only select what we need
        });

        return !!suppression;
    }

    /**
     * Helper function to add email to suppression list
     * Optimized with proper error handling and batching support
     */
    async suppressEmail(
        tenantId: string,
        productId: string | null,
        email: string,
        reason: string,
        source: string
    ): Promise<void> {
        const emailNorm = email.toLowerCase().trim();
        const emailHash = createHash('sha256').update(emailNorm).digest();

        try {
            await this.suppression.upsert({
                where: {
                    productId_emailHash: {
                        productId: productId || '',
                        emailHash,
                    },
                },
                update: {
                    reason,
                    source,
                },
                create: {
                    tenantId,
                    productId,
                    email,
                    emailNorm,
                    emailHash,
                    reason,
                    source,
                },
            });
        } catch (error) {
            // Log but don't fail the main operation
            console.error('Failed to suppress email:', error);
        }
    }

    /**
     * Batch suppress multiple emails for better performance
     */
    async suppressEmails(
        suppressions: Array<{
            tenantId: string;
            productId: string | null;
            email: string;
            reason: string;
            source: string;
        }>
    ): Promise<void> {
        const data = suppressions.map(({ tenantId, productId, email, reason, source }) => {
            const emailNorm = email.toLowerCase().trim();
            const emailHash = createHash('sha256').update(emailNorm).digest();

            return {
                tenantId,
                productId,
                email,
                emailNorm,
                emailHash,
                reason,
                source,
            };
        });

        try {
            await this.suppression.createMany({
                data,
                skipDuplicates: true,
            });
        } catch (error) {
            console.error('Failed to batch suppress emails:', error);
        }
    }
}
