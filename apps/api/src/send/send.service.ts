import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProvidersRouterService } from '../providers/router.service';
import { SendRequest, SendResponse, SendRequestSchema } from '@courierx/shared';
import { ErrorClassifier } from '../common/errors/error-taxonomy';

@Injectable()
export class SendService {
  constructor(
    private prisma: PrismaService,
    private providersRouter: ProvidersRouterService
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
}
