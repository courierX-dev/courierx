#!/usr/bin/env node

const { Client } = require('pg');

// Test different connection formats
const connectionStrings = [
    // Direct connection
    "postgresql://postgres:Adeolu_71wavedidwhat@db.pyrmsagxipzovmxevdsv.supabase.co:5432/postgres?sslmode=require",

    // Session pooler with postgres.project format
    "postgresql://postgres.pyrmsagxipzovmxevdsv:Adeolu_71wavedidwhat@aws-0-us-west-1.pooler.supabase.com:5432/postgres",

    // Session pooler with regular postgres
    "postgresql://postgres:Adeolu_71wavedidwhat@aws-0-us-west-1.pooler.supabase.com:5432/postgres",

    // Transaction pooler
    "postgresql://postgres.pyrmsagxipzovmxevdsv:Adeolu_71wavedidwhat@aws-0-us-west-1.pooler.supabase.com:6543/postgres",
];

async function testConnection(connectionString, name) {
    console.log(`\n🧪 Testing ${name}...`);
    console.log(`Connection: ${connectionString.replace(/:Adeolu_71wavedidwhat@/, ':***@')}`);

    const client = new Client({ connectionString });

    try {
        await client.connect();
        const result = await client.query('SELECT 1 as test');
        console.log('✅ Connection successful!');
        console.log(`Result: ${JSON.stringify(result.rows)}`);
        return true;
    } catch (error) {
        console.log(`❌ Connection failed: ${error.message}`);
        return false;
    } finally {
        try {
            await client.end();
        } catch (e) {
            // Ignore cleanup errors
        }
    }
}

async function main() {
    console.log('🔍 Testing Supabase Connection Formats');
    console.log('=====================================');

    const tests = [
        ['Direct Connection', connectionStrings[0]],
        ['Session Pooler (postgres.project)', connectionStrings[1]],
        ['Session Pooler (postgres)', connectionStrings[2]],
        ['Transaction Pooler', connectionStrings[3]],
    ];

    for (const [name, connectionString] of tests) {
        const success = await testConnection(connectionString, name);
        if (success) {
            console.log(`\n🎉 Found working connection: ${name}`);
            console.log(`Use this in your .env:`);
            console.log(`DATABASE_URL="${connectionString}"`);
            break;
        }
    }
}

main().catch(console.error);
