import { Module } from '@nestjs/common';
import { ProvidersRouterService } from './router.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [ProvidersRouterService],
    exports: [ProvidersRouterService],
})
export class ProvidersModule { }
