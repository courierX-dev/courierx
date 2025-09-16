import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export interface TenantRequest extends Request {
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
    use(req: TenantRequest, res: Response, next: NextFunction) {
        // Tenant is attached by ApiKeyGuard
        // This middleware can add additional tenant-specific logic
        next();
    }
}