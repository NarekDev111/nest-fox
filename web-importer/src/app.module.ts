import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { DirectusModule } from '@foxtrail-backend/directus';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { FoxImporterModule } from './fox-importer/fox-importer.module';
import { FoxValidatorModule } from './fox-validator/fox-validator.module';
import { PrismaModule } from '@foxtrail-backend/prisma';
import { WoocommerceModule } from '@foxtrail-backend/woocommerce';
import { defaultLoggingConfig, RequestLoggerMiddleware } from '@foxtrail-backend/logging';
import { AuthMiddleware, AuthModule } from '@foxtrail-backend/auth';
import { ExpImporterModule } from './exp-importer/exp-importer.module';
import { ExpValidatorModule } from './exp-validator/exp-validator.module';

@Module({
    imports: [
        ConfigModule.forRoot(),
        LoggerModule.forRoot(defaultLoggingConfig),
        DirectusModule,
        WoocommerceModule,
        ...(process.env.BACKEND_CONFIG == 'fox' ? [FoxImporterModule, FoxValidatorModule] : []),
        ...(process.env.BACKEND_CONFIG == 'exp' ? [ExpImporterModule, ExpValidatorModule] : []),
        PrismaModule,
        AuthModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer): any {
        consumer.apply(RequestLoggerMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL });
        consumer.apply(AuthMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL });
    }
}
