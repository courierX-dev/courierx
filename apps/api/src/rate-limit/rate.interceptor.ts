import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
    constructor(private prisma: PrismaService) { }

    async intercept(context: ExecutionContext, next: CallHandler): Promise<any> {
        const request = context.switchToHttp().getRequest();
        const product = request.product;

        if (!product) {
            // No product attached, skip rate limiting
            return next.handle();
        }

        // Check current hour usage
        const currentHour = new Date();
        currentHour.setMinutes(0, 0, 0); // Round down to hour

        // Atomic rate limit check using database function
        const rateLimit = product.ratePerHour || 50;

        try {
            // This should be an atomic increment-and-check operation
            const result = await this.prisma.$queryRaw<[{ current_count: number }]>`
                SELECT check_and_increment_rate_limit(${product.id}::uuid, ${currentHour}::timestamp, ${rateLimit}::integer) as current_count
            `;

            const currentUsage = result[0].current_count;

            if (currentUsage > rateLimit) {
                const nextHour = new Date(currentHour.getTime() + 60 * 60 * 1000);
                const retryAfter = Math.ceil((nextHour.getTime() - Date.now()) / 1000);

                const response = context.switchToHttp().getResponse();
                response.setHeader('Retry-After', retryAfter.toString());
                response.setHeader('X-RateLimit-Limit', rateLimit.toString());
                response.setHeader('X-RateLimit-Remaining', '0');
                response.setHeader('X-RateLimit-Reset', nextHour.toISOString());

                throw new HttpException(
                    {
                        message: 'Rate limit exceeded',
                        error: 'Too Many Requests',
                        statusCode: 429,
                        retryAfter,
                        limit: rateLimit,
                        remaining: 0,
                        reset: nextHour.toISOString(),
                    },
                    HttpStatus.TOO_MANY_REQUESTS
                );
            }

            // Add rate limit headers
            const response = context.switchToHttp().getResponse();
            response.setHeader('X-RateLimit-Limit', rateLimit.toString());
            response.setHeader('X-RateLimit-Remaining', (rateLimit - currentUsage - 1).toString());

            const nextHour = new Date(currentHour.getTime() + 60 * 60 * 1000);
            response.setHeader('X-RateLimit-Reset', nextHour.toISOString());

            return next.handle();
        } catch (error) {
            // If rate limiting fails, allow the request through but log the error
            console.error('Rate limiting error:', error);
            return next.handle();
        }
    }
}
