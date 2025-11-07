import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProvidersRouterService } from '../providers/router.service';
import { SendRequest, SendResponse, SendRequestSchema, SendTemplateRequest, SendTemplateRequestSchema, BulkSendRequest, BulkSendRequestSchema, BulkSendResponse } from '@courierx/shared';
import { ErrorClassifier } from '../common/errors/error-taxonomy';
import { TemplatesService } from '../templates/templates.service';
import Handlebars from 'handlebars';

@Injectable()
export class SendService {
  constructor(
    private prisma: PrismaService,
    private providersRouter: ProvidersRouterService,
    private templatesService: TemplatesService
  ) { }

  async send(request: SendRequest, tenantId: string, productId: string): Promise<SendResponse> {
    // Validate request
    const validatedRequest = SendRequestSchema.parse(request);

    // Check suppression for primary recipient
    const primaryEmail = validatedRequest.to[0];
    const isSupressed = await this.prisma.isEmailSuppressed(productId, primaryEmail);

    if (isSupressed) {
      // Log suppressed event
      await this.prisma.event.create({
        data: {
          tenantId,
          productId,
          email: primaryEmail,
          event: 'dropped',
          metaJson: { reason: 'suppressed' },
        },
      });

      return {
        id: `suppressed_${Date.now()}`,
        status: 'failed',
        provider: 'suppression',
        timestamp: new Date().toISOString(),
        metadata: { reason: 'Email address is suppressed' },
      };
    }

    try {
      // Send via provider router
      const response = await this.providersRouter.send(validatedRequest, productId);

      // Store message record
      const toEmail = validatedRequest.to[0];
      const toNorm = toEmail.toLowerCase().trim();
      const toHash = require('crypto').createHash('sha256').update(toNorm).digest();

      const message = await this.prisma.message.create({
        data: {
          id: response.id,
          tenantId,
          productId,
          toEmail,
          toNorm,
          toHash,
          subject: validatedRequest.subject,
          providerUsed: response.provider as any, // Cast to enum
          requestJson: validatedRequest,
        },
      });

      // Write success event
      await this.prisma.event.create({
        data: {
          tenantId,
          productId,
          messageId: message.id,
          email: toEmail,
          event: 'sent',
          provider: response.provider as any,
          metaJson: response.metadata || {},
        },
      });

      // Bump hourly usage counter for rate limiting
      await this.prisma.bumpHourlyUsage(productId);

      return response;
    } catch (error) {
      // Store failed message
      const failedId = `failed_${Date.now()}`;
      const toEmail = validatedRequest.to[0];
      const toNorm = toEmail.toLowerCase().trim();
      const toHash = Buffer.from(require('crypto').createHash('sha256').update(toNorm).digest());

      const message = await this.prisma.message.create({
        data: {
          id: failedId,
          tenantId,
          productId,
          toEmail,
          toNorm,
          toHash,
          subject: validatedRequest.subject,
          requestJson: { ...validatedRequest, error: (error as Error).message },
        },
      });

      // Classify the error
      const classifiedError = ErrorClassifier.classify(error as Error);

      // Write failure event with classification
      await this.prisma.event.create({
        data: {
          tenantId,
          productId,
          messageId: message.id,
          email: toEmail,
          event: 'dropped',
          metaJson: {
            error: classifiedError.message,
            errorType: classifiedError.type,
            errorCategory: classifiedError.category,
            retryable: classifiedError.retryable,
            provider: classifiedError.provider
          },
        },
      });

      throw new BadRequestException(`Failed to send email: ${classifiedError.message} (${classifiedError.type})`);
    }
  }

  async sendTemplate(request: SendTemplateRequest, tenantId: string, productId: string): Promise<SendResponse> {
    // Validate request
    const validatedRequest = SendTemplateRequestSchema.parse(request);

    // Render the template with variables
    const rendered = await this.templatesService.render(
      validatedRequest.templateId,
      validatedRequest.variables,
      productId
    );

    // Build SendRequest from template and variables
    const sendRequest: SendRequest = {
      to: validatedRequest.to,
      from: validatedRequest.from,
      subject: rendered.subject,
      html: rendered.html,
      cc: validatedRequest.cc,
      bcc: validatedRequest.bcc,
      replyTo: validatedRequest.replyTo,
      attachments: validatedRequest.attachments,
      tags: validatedRequest.tags,
      metadata: {
        ...validatedRequest.metadata,
        templateId: validatedRequest.templateId,
      },
    };

    // Use the existing send method
    return this.send(sendRequest, tenantId, productId);
  }

  async sendBulk(request: BulkSendRequest, tenantId: string, productId: string): Promise<BulkSendResponse> {
    // Validate request
    const validatedRequest = BulkSendRequestSchema.parse(request);

    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const results: BulkSendResponse['results'] = [];
    let successful = 0;
    let failed = 0;

    // Compile templates if variables are used
    const subjectTemplate = Handlebars.compile(validatedRequest.subject);
    const htmlTemplate = validatedRequest.html ? Handlebars.compile(validatedRequest.html) : null;
    const textTemplate = validatedRequest.text ? Handlebars.compile(validatedRequest.text) : null;

    // Process each recipient
    for (const recipient of validatedRequest.recipients) {
      try {
        // Render content with recipient-specific variables
        const variables = recipient.variables || {};
        const subject = subjectTemplate(variables);
        const html = htmlTemplate ? htmlTemplate(variables) : validatedRequest.html;
        const text = textTemplate ? textTemplate(variables) : validatedRequest.text;

        // Build send request
        const sendRequest: SendRequest = {
          to: [recipient.to],
          from: validatedRequest.from,
          subject,
          html,
          text,
          replyTo: validatedRequest.replyTo,
          attachments: validatedRequest.attachments,
          tags: validatedRequest.tags,
          metadata: {
            ...recipient.metadata,
            batchId,
          },
        };

        // Send the email
        const response = await this.send(sendRequest, tenantId, productId);

        results.push({
          to: recipient.to,
          messageId: response.id,
          status: 'sent',
        });
        successful++;
      } catch (error) {
        results.push({
          to: recipient.to,
          status: 'failed',
          error: (error as Error).message,
        });
        failed++;
      }
    }

    return {
      batchId,
      total: validatedRequest.recipients.length,
      successful,
      failed,
      results,
      timestamp: new Date().toISOString(),
    };
  }
}
