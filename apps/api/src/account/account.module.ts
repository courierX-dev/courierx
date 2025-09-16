import { Module } from '@nestjs/common';
import { AccountController } from './account.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [AccountController],
})
export class AccountModule { }
