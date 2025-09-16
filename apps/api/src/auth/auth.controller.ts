import { Controller, Get, UseGuards, Req, UseInterceptors } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';
import { RateLimitInterceptor } from '../rate-limit/rate.interceptor';

@Controller('v1')
@UseGuards(ApiKeyGuard)
export class AuthController {
    @Get('me')
    async getMe(@Req() req: any) {
        return {
            productId: req.product.id,
            tenantId: req.tenant.id,
            productName: req.product.name,
            tenantName: req.tenant.name,
            rateLimit: {
                perHour: req.product.ratePerHour,
                isWarming: req.product.isWarming,
            },
            timestamp: new Date().toISOString(),
        };
    }
}
