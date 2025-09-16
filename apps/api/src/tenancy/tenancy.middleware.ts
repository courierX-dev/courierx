import { Injectable, NestMiddleware } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';

export interface TenantRequest extends FastifyRequest {
    tenant?: {
        id: string;
        name: string;
        apiKeyHash: string;
        createdAt: Date;
        updatedAt: Date;
    };
}

@Injectable()
export class TenancyMiddleware implements NestMiddleware {
    use(req: TenantRequest, res: FastifyReply, next: () => void) {
        // Tenant is attached by ApiKeyGuard
        // This middleware can add additional tenant-specific logic
        next();
    }
}
