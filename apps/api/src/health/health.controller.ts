import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Health')
@Controller('v1')
export class HealthController {
    constructor(private readonly prisma: PrismaService) { }

    @Get('health')
    @ApiOperation({
        summary: 'Health check',
        description: 'Returns the health status of the API and database connectivity'
    })
    @ApiResponse({
        status: 200,
        description: 'Health status',
        schema: {
            type: 'object',
            properties: {
                ok: { type: 'boolean', example: true },
                timestamp: { type: 'string', format: 'date-time' },
                database: { type: 'string', example: 'connected' },
                version: { type: 'string', example: '1.0.0' }
            }
        }
    })
    async health() {
        try {
            // Test database connectivity
            await this.prisma.$queryRaw`SELECT 1`;

            return {
                ok: true,
                timestamp: new Date().toISOString(),
                database: 'connected',
                version: process.env.npm_package_version || '1.0.0',
            };
        } catch (error) {
            return {
                ok: false,
                timestamp: new Date().toISOString(),
                database: 'disconnected',
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    @Get('ready')
    @ApiOperation({
        summary: 'Readiness check',
        description: 'Returns detailed readiness status including database connectivity and data integrity'
    })
    @ApiResponse({
        status: 200,
        description: 'Readiness status',
        schema: {
            type: 'object',
            properties: {
                ok: { type: 'boolean', example: true },
                timestamp: { type: 'string', format: 'date-time' },
                database: { type: 'string', example: 'connected' },
                tenants: { type: 'number', example: 1 },
                status: { type: 'string', example: 'ready' }
            }
        }
    })
    async readiness() {
        try {
            // More comprehensive readiness check
            await this.prisma.$queryRaw`SELECT 1`;

            // Check if we have at least one tenant (basic data integrity)
            const tenantCount = await this.prisma.tenant.count();

            return {
                ok: true,
                timestamp: new Date().toISOString(),
                database: 'connected',
                tenants: tenantCount,
                status: 'ready',
            };
        } catch (error) {
            return {
                ok: false,
                timestamp: new Date().toISOString(),
                database: 'disconnected',
                status: 'not ready',
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
}
