import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { PrismaService } from '../src/prisma/prisma.service';
import { cleanupTestDatabase } from './test-database.setup';

export async function createTestApp(moduleMetadata: any): Promise<{
    app: NestFastifyApplication;
    module: TestingModule;
    prisma: PrismaService;
}> {
    const module: TestingModule = await Test.createTestingModule(moduleMetadata).compile();

    const app = module.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter()
    );

    const prisma = module.get<PrismaService>(PrismaService);

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    return { app, module, prisma };
}

export async function cleanupTestApp(app: INestApplication, module: TestingModule) {
    if (app) {
        await app.close();
    }
    if (module) {
        await module.close();
    }
    await cleanupTestDatabase();
}

export function createMockPrismaService() {
    return {
        tenant: {
            create: vi.fn(),
            findUnique: vi.fn(),
            findMany: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        product: {
            create: vi.fn(),
            findUnique: vi.fn(),
            findMany: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        apiKey: {
            create: vi.fn(),
            findFirst: vi.fn(),
            findUnique: vi.fn(),
            findMany: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        message: {
            create: vi.fn(),
            findUnique: vi.fn(),
            findMany: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        event: {
            create: vi.fn(),
            findMany: vi.fn(),
            deleteMany: vi.fn(),
        },
        suppression: {
            create: vi.fn(),
            findFirst: vi.fn(),
            findMany: vi.fn(),
            deleteMany: vi.fn(),
        },
        route: {
            create: vi.fn(),
            findMany: vi.fn(),
            deleteMany: vi.fn(),
        },
        provider: {
            create: vi.fn(),
            findMany: vi.fn(),
            deleteMany: vi.fn(),
        },
        webhookEvent: {
            create: vi.fn(),
            findMany: vi.fn(),
            deleteMany: vi.fn(),
        },
        rateUsageHourly: {
            create: vi.fn(),
            findUnique: vi.fn(),
            deleteMany: vi.fn(),
        },
        user: {
            create: vi.fn(),
            deleteMany: vi.fn(),
        },
        auditLog: {
            deleteMany: vi.fn(),
        },
        template: {
            deleteMany: vi.fn(),
        },
        sendingDomain: {
            deleteMany: vi.fn(),
        },
        // Helper functions
        isEmailSuppressed: vi.fn(),
        suppressEmail: vi.fn(),
        bumpHourlyUsage: vi.fn(),
        checkRateLimit: vi.fn(),
        $connect: vi.fn(),
        $disconnect: vi.fn(),
        $queryRaw: vi.fn(),
        $executeRawUnsafe: vi.fn(),
    };
}
