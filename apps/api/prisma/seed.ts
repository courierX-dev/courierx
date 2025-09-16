import { PrismaClient } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';

const prisma = new PrismaClient();

function hashEmail(email: string): { norm: string; hash: Buffer } {
    const norm = email.toLowerCase().trim();
    const hash = createHash('sha256').update(norm).digest();
    return { norm, hash };
}

function hashApiKey(key: string): Buffer {
    return createHash('sha256').update(key).digest();
}

function generateApiKey(): string {
    return 'cx_' + randomBytes(32).toString('hex');
}

async function main() {
    console.log('🌱 Seeding CourierX database...\n');

    // Create demo tenant
    const tenant = await prisma.tenant.create({
        data: {
            name: 'Demo Tenant',
            plan: 'free',
        },
    });
    console.log('✅ Created tenant:', tenant.name);

    // Create demo user
    const userEmail = 'demo@courierx.dev';
    const { norm: userEmailNorm, hash: userEmailHash } = hashEmail(userEmail);

    const user = await prisma.user.create({
        data: {
            email: userEmail,
            emailNorm: userEmailNorm,
            emailHash: userEmailHash,
            displayName: 'Demo User',
        },
    });
    console.log('✅ Created user:', user.email);

    // Create tenant membership
    await prisma.tenantMember.create({
        data: {
            tenantId: tenant.id,
            userId: user.id,
            role: 'owner',
        },
    });
    console.log('✅ Created tenant membership');

    // Create demo product
    const product = await prisma.product.create({
        data: {
            tenantId: tenant.id,
            name: 'CourierX Demo',
            slug: 'courierx-demo',
            defaultFrom: 'demo@courierx.dev',
            primaryProvider: 'ses',
            ratePerHour: 100,
            isWarming: false,
        },
    });
    console.log('✅ Created product:', product.name);

    // Create API key
    const plainApiKey = generateApiKey();
    const hashedApiKey = hashApiKey(plainApiKey);

    const apiKey = await prisma.apiKey.create({
        data: {
            productId: product.id,
            name: 'default',
            keyHash: hashedApiKey,
            active: true,
        },
    });
    console.log('✅ Created API key:', apiKey.name);

    // Create mock provider account
    const mockProvider = await prisma.providerAccount.create({
        data: {
            tenantId: tenant.id,
            type: 'ses', // Using SES as default, but will use mock in development
            enabled: true,
            credsMeta: {
                region: 'us-east-1',
                note: 'Demo provider account - configure with real credentials'
            },
        },
    });
    console.log('✅ Created provider account:', mockProvider.type);

    // Create route
    await prisma.route.create({
        data: {
            productId: product.id,
            providerId: mockProvider.id,
            role: 'primary',
            priority: 1,
            sticky: true,
        },
    });
    console.log('✅ Created route');

    // Create demo template
    await prisma.template.create({
        data: {
            productId: product.id,
            name: 'welcome',
            engine: 'hbs',
            subjectTpl: 'Welcome to {{productName}}!',
            htmlTpl: '<h1>Welcome {{name}}!</h1><p>Thanks for joining {{productName}}.</p>',
        },
    });
    console.log('✅ Created template');

    // Create sending domain
    await prisma.sendingDomain.create({
        data: {
            tenantId: tenant.id,
            productId: product.id,
            domain: 'courierx.dev',
            spfStatus: 'valid',
            dkimStatus: 'valid',
            dmarcStatus: 'valid',
        },
    });
    console.log('✅ Created sending domain');

    console.log('\n🎉 Seed completed successfully!\n');
    console.log('📋 Demo Configuration:');
    console.log('─'.repeat(50));
    console.log(`Tenant ID:     ${tenant.id}`);
    console.log(`Product ID:    ${product.id}`);
    console.log(`API Key:       ${plainApiKey}`);
    console.log(`User Email:    ${user.email}`);
    console.log('─'.repeat(50));
    console.log('\n💡 Add this to your .env file:');
    console.log(`DEMO_API_KEY="${plainApiKey}"`);
    console.log(`DEMO_TENANT_ID="${tenant.id}"`);
    console.log(`DEMO_PRODUCT_ID="${product.id}"`);
    console.log('\n🧪 Test with:');
    console.log(`curl -X POST http://localhost:3000/v1/send \\`);
    console.log(`  -H "Authorization: Bearer ${plainApiKey}" \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '{"to":["test@example.com"],"from":"demo@courierx.dev","subject":"Test","text":"Hello World"}'`);
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
