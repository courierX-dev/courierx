import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { hashApiKey } from '@courierx/shared';

@Injectable()
export class ApiKeyGuard implements CanActivate {
    constructor(private prisma: PrismaService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;
        const apiKeyHeader = request.headers['x-api-key'] || request.headers['X-API-Key'];

        let apiKey: string;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            apiKey = authHeader.substring(7);
        } else if (apiKeyHeader) {
            apiKey = Array.isArray(apiKeyHeader) ? apiKeyHeader[0] : apiKeyHeader;
        } else {
            throw new UnauthorizedException('Missing or invalid API key');
        }
        const hashedKey = Buffer.from(require('crypto').createHash('sha256').update(apiKey).digest());

        const apiKeyRecord = await this.prisma.apiKey.findFirst({
            where: {
                keyHash: hashedKey,
                active: true
            },
            include: {
                product: {
                    include: {
                        tenant: true
                    }
                }
            }
        });

        if (!apiKeyRecord) {
            throw new UnauthorizedException('Invalid API key');
        }

        // Attach tenant and product to request for use in controllers
        request.tenant = apiKeyRecord.product.tenant;
        request.product = apiKeyRecord.product;
        return true;
    }
}
