import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

export function setupSwagger(app: INestApplication): void {
    const config = new DocumentBuilder()
        .setTitle('CourierX API')
        .setDescription(`
# CourierX - Multi-Provider Email Delivery Service

CourierX is a production-ready email delivery service that provides:

- **Multi-Provider Support**: SendGrid, Mailgun, AWS SES, SMTP, and more
- **Intelligent Routing**: Automatic failover between providers
- **Suppression Management**: Automatic bounce and complaint handling
- **Rate Limiting**: Per-product hourly rate limits
- **Webhook Processing**: Real-time event tracking
- **Multi-Tenancy**: Isolated tenant environments

## Authentication

All API endpoints require authentication using an API key. Include your API key in one of these ways:

- **Authorization Header**: \`Authorization: Bearer YOUR_API_KEY\`
- **Custom Header**: \`x-api-key: YOUR_API_KEY\`

## Rate Limiting

API requests are rate-limited per product. When you exceed your hourly limit, you'll receive a \`429 Too Many Requests\` response with a \`Retry-After\` header.

## Error Handling

The API uses standard HTTP status codes and returns detailed error messages in JSON format:

\`\`\`json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
\`\`\`

## Webhooks

CourierX processes webhooks from email providers to track delivery events and manage suppressions automatically. Supported providers:

- SendGrid
- Mailgun
- AWS SES/SNS

## Support

For support and documentation, visit: https://github.com/your-org/courierx
        `)
        .setVersion('1.0.0')
        .setContact(
            'CourierX Support',
            'https://github.com/your-org/courierx',
            'support@courierx.dev'
        )
        .setLicense('MIT', 'https://opensource.org/licenses/MIT')
        .addBearerAuth(
            {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'API Key',
                description: 'Enter your API key',
            },
            'bearer'
        )
        .addApiKey(
            {
                type: 'apiKey',
                name: 'x-api-key',
                in: 'header',
                description: 'API key for authentication',
            },
            'x-api-key'
        )
        .addServer('http://localhost:3000', 'Development server')
        .addServer('https://api.courierx.dev', 'Production server')
        .addTag('Health', 'Health check endpoints')
        .addTag('Email', 'Email sending and management')
        .addTag('Webhooks', 'Webhook processing endpoints')
        .addTag('Account', 'Account and authentication')
        .build();

    const document = SwaggerModule.createDocument(app, config, {
        operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
    });

    SwaggerModule.setup('docs', app, document, {
        customSiteTitle: 'CourierX API Documentation',
        customfavIcon: '/favicon.ico',
        customCss: `
            .swagger-ui .topbar { display: none }
            .swagger-ui .info .title { color: #2563eb }
            .swagger-ui .scheme-container { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
        `,
        swaggerOptions: {
            persistAuthorization: true,
            displayRequestDuration: true,
            filter: true,
            showExtensions: true,
            showCommonExtensions: true,
        },
    });
}
