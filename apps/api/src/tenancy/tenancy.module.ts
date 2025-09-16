import { Module, MiddlewareConsumer } from '@nestjs/common';
import { TenancyMiddleware } from './tenancy.middleware';

@Module({
    providers: [TenancyMiddleware],
})
export class TenancyModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(TenancyMiddleware).forRoutes('*');
    }
}