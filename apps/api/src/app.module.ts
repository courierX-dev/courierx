import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { SendModule } from './send/send.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { AuthModule } from './auth/auth.module';
import { TenancyModule } from './tenancy/tenancy.module';
import { AccountModule } from './account/account.module';
import { MessagesModule } from './messages/messages.module';
import { TemplatesModule } from './templates/templates.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env.local', '.env'],
        }),
        ThrottlerModule.forRoot([{
            ttl: 60000, // 1 minute
            limit: 100, // requests per minute
        }]),
        PrismaModule,
        HealthModule,
        AuthModule,
        TenancyModule,
        SendModule,
        WebhooksModule,
        AccountModule,
        MessagesModule,
        TemplatesModule,
    ],
})
export class AppModule { }
