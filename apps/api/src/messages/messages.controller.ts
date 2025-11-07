import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiSecurity, ApiParam } from '@nestjs/swagger';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { MessagesService } from './messages.service';

@ApiTags('Messages')
@Controller('v1/messages')
@UseGuards(ApiKeyGuard)
@ApiBearerAuth('bearer')
@ApiSecurity('x-api-key')
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Get(':id')
  @ApiOperation({
    summary: 'Get message status and events',
    description: `
Retrieve detailed information about a specific message, including:
- Message details (recipient, subject, provider used)
- Current status (queued, sent, delivered, failed, etc.)
- Complete event history with timestamps
- Delivery tracking information

**Status Values:**
- \`queued\` - Message is queued for delivery
- \`sent\` - Message was sent to the provider
- \`delivered\` - Message was successfully delivered
- \`failed\` - Message delivery failed (bounce/reject)
- \`dropped\` - Message was dropped (suppressed)
- \`deferred\` - Delivery temporarily deferred

**Authentication:**
Requires a valid API key. Only messages belonging to your product are accessible.
    `
  })
  @ApiParam({
    name: 'id',
    description: 'Message ID returned from the send endpoint',
    example: 'msg_1234567890abcdef',
  })
  @ApiResponse({
    status: 200,
    description: 'Message details retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'msg_1234567890abcdef' },
        to: { type: 'string', example: 'recipient@example.com' },
        subject: { type: 'string', example: 'Welcome to CourierX' },
        provider: { type: 'string', example: 'sendgrid', nullable: true },
        status: {
          type: 'string',
          enum: ['queued', 'sent', 'delivered', 'failed', 'dropped', 'deferred'],
          example: 'delivered'
        },
        createdAt: { type: 'string', format: 'date-time', example: '2025-09-16T10:30:00.000Z' },
        events: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: '12345' },
              event: {
                type: 'string',
                example: 'delivered',
                enum: ['queued', 'sent', 'delivered', 'bounce', 'complaint', 'open', 'click', 'dropped', 'reject', 'deferred', 'retry']
              },
              provider: { type: 'string', example: 'sendgrid', nullable: true },
              timestamp: { type: 'string', format: 'date-time', example: '2025-09-16T10:30:15.000Z' },
              metadata: { type: 'object', nullable: true }
            }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Message not found or does not belong to your product',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Message with ID msg_xyz not found' },
        error: { type: 'string', example: 'Not Found' }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing API key',
  })
  async getMessage(@Param('id') id: string, @Req() req: any) {
    return this.messagesService.getMessageById(id, req.product.id);
  }
}
