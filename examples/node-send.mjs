#!/usr/bin/env node

import { CourierXClient } from '@courierx/client';

// Example using the CourierX client
const client = new CourierXClient({
    apiKey: process.env.COURIERX_API_KEY || 'cx_your_api_key_here',
    baseUrl: process.env.COURIERX_BASE_URL || 'http://localhost:3000',
});

async function sendEmail() {
    try {
        const response = await client.send({
            to: ['recipient@example.com'],
            from: 'sender@example.com',
            subject: 'Hello from CourierX!',
            html: '<h1>Hello World</h1><p>This email was sent via CourierX.</p>',
            text: 'Hello World\n\nThis email was sent via CourierX.',
        });

        console.log('✅ Email sent successfully:', response);
    } catch (error) {
        console.error('❌ Failed to send email:', error.message);
    }
}

// Example using direct REST API
async function sendEmailREST() {
    try {
        const response = await fetch('http://localhost:3000/v1/send', {
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

// Run examples
console.log('🚀 CourierX Email Examples\n');

console.log('📧 Sending via Client SDK...');
await sendEmail();

console.log('\n📧 Sending via REST API...');
await sendEmailREST();