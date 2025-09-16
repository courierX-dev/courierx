// Simple database connection test using Prisma
const { PrismaClient } = require('@prisma/client');

async function testConnection() {
    console.log('🧪 Testing database connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:([^@]+)@/, ':***@'));

    const prisma = new PrismaClient();

    try {
        await prisma.$connect();
        console.log('✅ Connected to database successfully!');

        const result = await prisma.$queryRaw`SELECT 1 as test`;
        console.log('✅ Query executed successfully:', result);

        return true;
    } catch (error) {
        console.log('❌ Connection failed:', error.message);

        if (error.message.includes('Tenant or user not found')) {
            console.log('\n💡 Authentication issue - check:');
            console.log('   1. Password is correct in Supabase dashboard');
            console.log('   2. Project reference is correct');
            console.log('   3. Try resetting the database password');
        }

        return false;
    } finally {
        await prisma.$disconnect();
    }
}

testConnection();
