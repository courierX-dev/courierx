#!/usr/bin/env tsx

/**
 * Database setup script for CourierX
 * This script helps verify database connectivity and run initial setup
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

async function main() {
    console.log('🔧 CourierX Database Setup\n');

    try {
        // Test basic connectivity
        console.log('1. Testing database connectivity...');
        await prisma.$queryRaw`SELECT 1`;
        console.log('   ✅ Database connection successful');

        // Check if migrations are needed
        console.log('\n2. Checking migration status...');
        try {
            const result = await prisma.$queryRaw`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_schema = 'public'
                    AND table_name = 'tenants'
                );
            ` as [{ exists: boolean }];

            if (!result[0].exists) {
                console.log('   ⚠️  Tables not found. Running migrations...');
                execSync('pnpm prisma migrate dev --name init', {
                    stdio: 'inherit',
                    cwd: process.cwd()
                });
                console.log('   ✅ Migrations completed');
            } else {
                console.log('   ✅ Database schema is up to date');
            }
        } catch (error) {
            console.log('   ⚠️  Could not check migration status, running migrations...');
            execSync('pnpm prisma migrate dev', {
                stdio: 'inherit',
                cwd: process.cwd()
            });
        }

        // Generate Prisma client
        console.log('\n3. Generating Prisma client...');
        execSync('pnpm prisma generate', {
            stdio: 'inherit',
            cwd: process.cwd()
        });
        console.log('   ✅ Prisma client generated');

        // Check if we have demo data
        console.log('\n4. Checking for demo data...');
        const tenantCount = await prisma.tenant.count();

        if (tenantCount === 0) {
            console.log('   ⚠️  No tenants found. Running seed script...');
            execSync('pnpm prisma db seed', {
                stdio: 'inherit',
                cwd: process.cwd()
            });
            console.log('   ✅ Demo data seeded');
        } else {
            console.log(`   ✅ Found ${tenantCount} tenant(s) in database`);
        }

        // Final connectivity test
        console.log('\n5. Final verification...');
        const stats = await prisma.$queryRaw`
            SELECT
                (SELECT COUNT(*) FROM tenants) as tenant_count,
                (SELECT COUNT(*) FROM products) as product_count,
                (SELECT COUNT(*) FROM "api_keys") as api_key_count
        ` as [{ tenant_count: bigint, product_count: bigint, api_key_count: bigint }];

        console.log('   ✅ Database verification complete');
        console.log(`      - Tenants: ${stats[0].tenant_count}`);
        console.log(`      - Products: ${stats[0].product_count}`);
        console.log(`      - API Keys: ${stats[0].api_key_count}`);

        console.log('\n🎉 Database setup completed successfully!');
        console.log('\n💡 Next steps:');
        console.log('   1. Start the API server: pnpm dev');
        console.log('   2. Test health endpoint: curl http://localhost:3000/v1/health');
        console.log('   3. Use the API key from seed output to test /v1/send');

    } catch (error) {
        console.error('\n❌ Database setup failed:', error.message);

        if (error.message.includes('connect')) {
            console.log('\n💡 Connection troubleshooting:');
            console.log('   1. Check your DATABASE_URL in .env');
            console.log('   2. Ensure your database is running');
            console.log('   3. Verify network connectivity');
            console.log('   4. For Supabase: check connection string format');
        }

        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
