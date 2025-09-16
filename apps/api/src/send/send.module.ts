import { Module } from '@nestjs/common';
import { SendController } from './send.controller';
import { SendService } from './send.service';
import { ProvidersModule } from '../providers/providers.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [ProvidersModule, PrismaModule],
    controllers: [SendController],
    providers: [SendService],
})
export class SendModule { }
