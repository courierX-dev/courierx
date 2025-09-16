import { Controller, Post, Body, Headers, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { WebhooksService } from './webhooks.service';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
    constructor(private webhooksService: WebhooksService) { }

    @Post('sendgrid')
    @ApiOperation({
        summary: 'SendGrid webhook endpoint',
        description: `
Process webhook events from SendGrid for email delivery tracking.

**Supported Events:**
- delivered, bounce, dropped, deferred
- open, click, unsubscribe, spamreport

**Automatic Actions:**
- Creates suppression entries for bounces and complaints
- Logs all events for delivery tracking
- Updates message status in real-time

**Security:**
Webhook signature verification is performed using SendGrid's signature header.
        `
    })
    @ApiHeader({
        name: 'x-twilio-email-event-webhook-signature',
        description: 'SendGrid webhook signature for verification',
        required: false
    })
    @ApiResponse({
        status: 200,
        description: 'Webhook processed successfully',
        schema: {
            type: 'object',
            properties: {
                processed: { type: 'number', example: 3 },
                status: { type: 'string', example: 'success' }
            }
        }
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid webhook payload or signature'
    })
    async handleSendGrid(
        @Body() events: any[],
        @Headers('x-twilio-email-event-webhook-signature') signature?: string
    ) {
        return this.webhooksService.processSendGridWebhook(events, signature);
    }

    @Post('mailgun')
    @ApiOperation({
        summary: 'Mailgun webhook endpoint',
        description: `
Process webhook events from Mailgun for email delivery tracking.

**Supported Events:**
- delivered, failed, opened, clicked
- unsubscribed, complained

**Security:**
Webhook signature verification using HMAC-SHA256 with timestamp and token.
        `
    })
    @ApiHeader({
        name: 'x-mailgun-signature-timestamp',
        description: 'Mailgun webhook timestamp',
        required: false
    })
    @ApiHeader({
        name: 'x-mailgun-signature-token',
        description: 'Mailgun webhook token',
        required: false
    })
    @ApiHeader({
        name: 'x-mailgun-signature-signature',
        description: 'Mailgun webhook signature',
        required: false
    })
    @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
    async handleMailgun(
        @Body() event: any,
        @Headers('x-mailgun-signature-timestamp') timestamp?: string,
        @Headers('x-mailgun-signature-token') token?: string,
        @Headers('x-mailgun-signature-signature') signature?: string
    ) {
        return this.webhooksService.processMailgunWebhook(event, { timestamp, token, signature });
    }

    @Post('ses')
    @ApiOperation({
        summary: 'AWS SES/SNS webhook endpoint',
        description: `
Process webhook notifications from AWS SES via SNS for email delivery tracking.

**Supported Events:**
- send, delivery, bounce, complaint
- reject, click, open

**Security:**
SNS signature verification and topic ARN validation.
        `
    })
    @ApiHeader({
        name: 'x-amz-sns-message-type',
        description: 'SNS message type (Notification, SubscriptionConfirmation, etc.)',
        required: false
    })
    @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
    async handleSES(
        @Body() notification: any,
        @Headers('x-amz-sns-message-type') messageType?: string
    ) {
        return this.webhooksService.processSESWebhook(notification, messageType);
    }
}
