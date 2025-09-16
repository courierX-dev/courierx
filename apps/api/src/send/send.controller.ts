import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { SendService } from './send.service';
import { SendRequest, SendResponse } from '@courierx/shared';
import { TenantRequest } from '../tenancy/tenancy.middleware';

@ApiTags('Email')
@Controller('v1/send')
@UseGuards(ApiKeyGuard)
@ApiBearerAuth('bearer')
@ApiSecurity('x-api-key')
export class SendController {
  constructor(private sendService: SendService) { }

  @Post()
  @ApiOperation({
    summary: 'Send email',
    description: `
Send an email through the CourierX delivery system.

**Features:**
- Multi-provider routing with automatic failover
- Suppression checking to prevent sending to bounced/complained addresses
- Rate limiting per product
- Complete delivery tracking and event logging

**Authentication:**
Requires a valid API key in the Authorization header or x-api-key header.

**Rate Limiting:**
Requests are limited based on your product's hourly rate limit. Exceeded limits return 429 status.
        `
  })
  @ApiResponse({
    status: 201,
    description: 'Email sent successfully',
    schema: {
      type: 'object',
      properties: {
        messageId: { type: 'string', example: 'msg_1234567890abcdef' },
        status: { type: 'string', enum: ['sent', 'failed'], example: 'sent' },
        provider: { type: 'string', example: 'sendgrid' },
        timestamp: { type: 'string', format: 'date-time', example: '2025-09-16T10:30:00.000Z' }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error or suppressed email',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Email is suppressed due to previous bounce' },
        error: { type: 'string', example: 'Bad Request' }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing API key',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Invalid API key' },
        error: { type: 'string', example: 'Unauthorized' }
      }
    }
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests - rate limit exceeded',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 429 },
        message: { type: 'string', example: 'Rate limit exceeded' },
        error: { type: 'string', example: 'Too Many Requests' }
      }
    }
  })
  async send(
    @Body() request: SendRequest,
    @Req() req: any // Updated to include product
  ): Promise<SendResponse> {
    return this.sendService.send(request, req.tenant.id, req.product.id);
  }
}
