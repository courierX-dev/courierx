import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Logger } from '@nestjs/common';

export function setupLogging(app: NestFastifyApplication) {
    const logger = new Logger('CourierX');

    // Log all requests in development
    if (process.env.NODE_ENV === 'development') {
        app.getHttpAdapter().getInstance().addHook('onRequest', async (request) => {
            logger.log(`${request.method} ${request.url}`);
        });
    }

    // Global error handler
    process.on('uncaughtException', (error) => {
        logger.error('Uncaught Exception:', error);
        process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });
}