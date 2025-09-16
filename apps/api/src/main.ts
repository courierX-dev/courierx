import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { setupLogging } from './common/logging';
import { setupSwagger } from './swagger';

async function bootstrap() {
    const app = await NestFactory.create<NestFastifyApplication>(
        AppModule,
        new FastifyAdapter({ logger: true })
    );

    setupLogging(app);

    app.useGlobalPipes(new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
    }));

    app.enableCors();

    // Setup Swagger documentation
    if (process.env.NODE_ENV !== 'production') {
        setupSwagger(app);
    }

    const port = process.env.PORT || 3000;
    await app.listen(port, '0.0.0.0');

    console.log(`🚀 CourierX API running on port ${port}`);

    if (process.env.NODE_ENV !== 'production') {
        console.log(`📚 API Documentation available at http://localhost:${port}/docs`);
    }
}

bootstrap();
