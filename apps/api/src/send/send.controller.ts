import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { SendService } from './send.service';
import { SendRequest, SendResponse, SendTemplateRequest, BulkSendRequest, BulkSendResponse } from '@courierx/shared';
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

  @Post('template')
  @ApiOperation({
    summary: 'Send email using a template',
    description: `
Send an email using a pre-defined template with dynamic variables.

**Features:**
- Renders templates with Handlebars syntax
- Supports all template variables
- Multi-provider routing with automatic failover
- Suppression checking and rate limiting
- Complete delivery tracking

**Template Variables:**
Pass any variables needed by your template in the \`variables\` object.

**Example:**
\`\`\`json
{
  "to": ["user@example.com"],
  "from": "noreply@myapp.com",
  "templateId": "welcome-email",
  "variables": {
    "firstName": "John",
    "lastName": "Doe",
    "activationLink": "https://myapp.com/activate?token=xyz"
  }
}
\`\`\`

**Authentication:**
Requires a valid API key in the Authorization header or x-api-key header.
    `
  })
  @ApiResponse({
    status: 201,
    description: 'Email sent successfully using template',
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
    description: 'Bad request - validation error, template rendering error, or suppressed email',
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing API key',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests - rate limit exceeded',
  })
  async sendTemplate(
    @Body() request: SendTemplateRequest,
    @Req() req: any
  ): Promise<SendResponse> {
    return this.sendService.sendTemplate(request, req.tenant.id, req.product.id);
  }

  @Post('batch')
  @ApiOperation({
    summary: 'Send bulk emails to multiple recipients',
    description: `
Send the same email (with personalization) to multiple recipients in a single batch.

**Features:**
- Send up to 1,000 recipients per batch
- Personalize content using Handlebars variables per recipient
- Automatic rate limiting and suppression checking
- Individual tracking for each recipient
- Detailed success/failure reporting

**Personalization:**
Use Handlebars syntax (e.g., {{firstName}}) in subject/html/text to personalize per recipient.

**Example:**
\`\`\`json
{
  "from": "newsletter@myapp.com",
  "subject": "Hello {{firstName}}!",
  "html": "<h1>Hi {{firstName}} {{lastName}}</h1>",
  "recipients": [
    {
      "to": "user1@example.com",
      "variables": { "firstName": "John", "lastName": "Doe" },
      "metadata": { "userId": "123" }
    },
    {
      "to": "user2@example.com",
      "variables": { "firstName": "Jane", "lastName": "Smith" },
      "metadata": { "userId": "456" }
    }
  ]
}
\`\`\`

**Rate Limiting:**
Each recipient counts toward your hourly rate limit.

**Best Practices:**
- Keep batches under 1,000 recipients
- Use batch endpoint for newsletters and campaigns
- Monitor the returned results for failures
    `
  })
  @ApiResponse({
    status: 201,
    description: 'Batch processing complete',
    schema: {
      type: 'object',
      properties: {
        batchId: { type: 'string', example: 'batch_1234567890_abc' },
        total: { type: 'number', example: 100 },
        successful: { type: 'number', example: 98 },
        failed: { type: 'number', example: 2 },
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              to: { type: 'string', example: 'user@example.com' },
              messageId: { type: 'string', example: 'msg_xyz', nullable: true },
              status: { type: 'string', enum: ['sent', 'failed'], example: 'sent' },
              error: { type: 'string', nullable: true }
            }
          }
        },
        timestamp: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error or batch too large',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing API key',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests - rate limit exceeded',
  })
  async sendBatch(
    @Body() request: BulkSendRequest,
    @Req() req: any
  ): Promise<BulkSendResponse> {
    return this.sendService.sendBulk(request, req.tenant.id, req.product.id);
  }
}
