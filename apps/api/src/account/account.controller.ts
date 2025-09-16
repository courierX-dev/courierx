import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { ApiKeyGuard } from '../auth/api-key.guard';

@ApiTags('Account')
@Controller('v1')
@UseGuards(ApiKeyGuard)
@ApiBearerAuth('bearer')
@ApiSecurity('x-api-key')
export class AccountController {
    @Get('me')
    @ApiOperation({
        summary: 'Get account information',
        description: `
Get information about the authenticated API key, including:
- Product and tenant details
- Rate limiting information
- API key permissions
- Usage statistics

This endpoint is useful for validating API keys and understanding account limits.
        `
    })
    @ApiResponse({
        status: 200,
        description: 'Account information',
        schema: {
            type: 'object',
            properties: {
                apiKey: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', example: 'key_1234567890abcdef' },
                        name: { type: 'string', example: 'Production API Key' },
                        permissions: {
                            type: 'array',
                            items: { type: 'string' },
                            example: ['SEND_EMAIL', 'VIEW_ANALYTICS']
                        },
                        status: { type: 'string', example: 'ACTIVE' },
                        createdAt: { type: 'string', format: 'date-time' }
                    }
                },
                product: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', example: 'prod_1234567890abcdef' },
                        name: { type: 'string', example: 'My Email Service' },
                        status: { type: 'string', example: 'ACTIVE' },
                        rateLimitPerHour: { type: 'number', example: 1000 }
                    }
                },
                tenant: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', example: 'tenant_1234567890abcdef' },
                        name: { type: 'string', example: 'Acme Corporation' },
                        domain: { type: 'string', example: 'acme.com' },
                        status: { type: 'string', example: 'ACTIVE' }
                    }
                },
                usage: {
                    type: 'object',
                    properties: {
                        currentHour: { type: 'number', example: 45 },
                        remainingThisHour: { type: 'number', example: 955 },
                        resetTime: { type: 'string', format: 'date-time' }
                    }
                }
            }
        }
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - invalid or missing API key'
    })
    async getMe(@Req() req: any) {
        const { apiKey, product, tenant } = req;

        // Calculate current hour usage
        const currentHour = new Date();
        currentHour.setMinutes(0, 0, 0);

        const nextHour = new Date(currentHour);
        nextHour.setHours(nextHour.getHours() + 1);

        // Note: In a real implementation, you'd fetch actual usage from the database
        const currentUsage = 0; // This would come from rate usage tracking
        const remaining = Math.max(0, product.rateLimitPerHour - currentUsage);

        return {
            apiKey: {
                id: apiKey.id,
                name: apiKey.name,
                permissions: apiKey.permissions,
                status: apiKey.status,
                createdAt: apiKey.createdAt,
            },
            product: {
                id: product.id,
                name: product.name,
                status: product.status,
                rateLimitPerHour: product.rateLimitPerHour,
            },
            tenant: {
                id: tenant.id,
                name: tenant.name,
                domain: tenant.domain,
                status: tenant.status,
            },
            usage: {
                currentHour: currentUsage,
                remainingThisHour: remaining,
                resetTime: nextHour.toISOString(),
            },
        };
    }
}
