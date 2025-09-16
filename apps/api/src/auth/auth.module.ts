import { Module } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';
import { AuthController } from './auth.controller';
import { RateLimitInterceptor } from '../rate-limit/rate.interceptor';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [AuthController],
    providers: [ApiKeyGuard, RateLimitInterceptor],
    exports: [ApiKeyGuard, RateLimitInterceptor],
})
export class AuthModule { }
