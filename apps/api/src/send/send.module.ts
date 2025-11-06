import { Module } from '@nestjs/common';
import { SendController } from './send.controller';
import { SendService } from './send.service';
import { ProvidersModule } from '../providers/providers.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TemplatesModule } from '../templates/templates.module';

@Module({
    imports: [ProvidersModule, PrismaModule, TemplatesModule],
    controllers: [SendController],
    providers: [SendService],
})
export class SendModule { }
