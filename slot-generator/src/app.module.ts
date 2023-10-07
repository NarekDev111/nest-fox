import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { DirectusModule } from '@foxtrail-backend/directus';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { StartRuleController } from './app/start-rule/start-rule.controller';
import { StartRuleService } from './app/start-rule/start-rule.service';
import { StartRuleValidatorService } from './app/start-rule/validator/start-rule-validator.service';
import { StartRuleGeneratorService } from './app/start-rule/generator/start-rule-generator.service';
import { ClosureController } from './app/closure/closure.controller';
import { ClosureService } from './app/closure/closure.service';
import { defaultLoggingConfig, RequestLoggerMiddleware } from '@foxtrail-backend/logging';
import { PrismaService } from '@foxtrail-backend/prisma';
import { AuthMiddleware, AuthModule } from '@foxtrail-backend/auth';

@Module({
    imports: [
        ConfigModule.forRoot(), //
        LoggerModule.forRoot(defaultLoggingConfig),
        DirectusModule,
        AuthModule,
    ],
    controllers: [ClosureController, StartRuleController],
    providers: [
        StartRuleService, //
        PrismaService,
        ClosureService,
        StartRuleValidatorService,
        StartRuleGeneratorService,
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer): any {
        consumer.apply(RequestLoggerMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL });
        if (!process.env.INTEGRATION_TEST) {
            consumer.apply(AuthMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL });
        }
    }
}
