import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

export async function setupTestDatabase() {
    const testDatabaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/courierx_test';

    try {
        // Create test database if it doesn't exist
        const baseUrl = testDatabaseUrl.replace('/courierx_test', '/postgres');
        const prisma = new PrismaClient({ datasources: { db: { url: baseUrl } } });

        try {
            await prisma.$executeRawUnsafe('CREATE DATABASE courierx_test');
            console.log('✅ Test database created');
        } catch (error) {
            // Database might already exist
            console.log('ℹ️ Test database already exists or creation failed');
        }

        await prisma.$disconnect();

        // Run migrations on test database
        process.env.DATABASE_URL = testDatabaseUrl;
        execSync('npx prisma migrate deploy', { stdio: 'inherit' });
        console.log('✅ Test database migrations applied');

        return testDatabaseUrl;
    } catch (error) {
        console.error('❌ Failed to setup test database:', error);
        throw error;
    }
}

export async function cleanupTestDatabase() {
    const testDatabaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/courierx_test';

    try {
        const prisma = new PrismaClient({ datasources: { db: { url: testDatabaseUrl } } });

        // Clean up all tables in reverse dependency order
        await prisma.event.deleteMany();
        await prisma.webhookEvent.deleteMany();
        await prisma.message.deleteMany();
        await prisma.suppression.deleteMany();
        await prisma.rateUsageHourly.deleteMany();
        await prisma.route.deleteMany();
        await prisma.apiKey.deleteMany();
        await prisma.product.deleteMany();
        await prisma.user.deleteMany();
        await prisma.tenant.deleteMany();
        await prisma.provider.deleteMany();
        await prisma.auditLog.deleteMany();
        await prisma.template.deleteMany();
        await prisma.sendingDomain.deleteMany();

        await prisma.$disconnect();
        console.log('✅ Test database cleaned up');
    } catch (error) {
        console.error('❌ Failed to cleanup test database:', error);
    }
}
