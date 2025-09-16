import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { SendGridVerifier } from './verifiers/sendgrid';
import { MailgunVerifier } from './verifiers/mailgun';
import { SESVerifier } from './verifiers/ses';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [WebhooksController],
    providers: [WebhooksService, SendGridVerifier, MailgunVerifier, SESVerifier],
})
export class WebhooksModule { }
