#!/usr/bin/env node

/**
 * CourierX Email Examples
 * 
 * This file demonstrates how to send emails using the CourierX REST API.
 * 
 * Note: A Node.js SDK (@courierx/node) is planned for a future release.
 * For now, use the REST API directly as shown below.
 */

// Example using direct REST API
async function sendEmailREST() {
    try {
        const response = await fetch('http://localhost:4000/api/v1/messages/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.COURIERX_API_KEY || 'cx_your_api_key_here'}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: ['recipient@example.com'],
                from: 'sender@example.com',
                subject: 'Hello from CourierX REST API!',
                html: '<h1>Hello World</h1><p>This email was sent via CourierX REST API.</p>',
                text: 'Hello World\n\nThis email was sent via CourierX REST API.',
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        const result = await response.json();
        console.log('✅ Email sent successfully via REST:', result);
    } catch (error) {
        console.error('❌ Failed to send email via REST:', error.message);
    }
}

// Example using cURL (for reference)
function printCurlExample() {
    console.log(`
📋 cURL Example:

curl -X POST http://localhost:4000/api/v1/messages/send \\
  -H "Authorization: Bearer cx_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": ["recipient@example.com"],
    "from": "sender@example.com",
    "subject": "Hello from CourierX",
    "html": "<h1>Hello World</h1>",
    "text": "Hello World"
  }'
    `);
}

// Run examples
console.log('🚀 CourierX Email Examples\n');

printCurlExample();

console.log('\n📧 Sending via REST API...');
await sendEmailREST();