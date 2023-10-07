import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GraphlQlService } from './graphl-ql/graphl-ql.service';
import { PrismaModule } from '@foxtrail-backend/prisma';
import { AuthMiddleware, AuthModule } from '@foxtrail-backend/auth';
import { LoggerModule } from 'nestjs-pino';
import { defaultLoggingConfig } from '@foxtrail-backend/logging';

@Module({
    imports: [PrismaModule, LoggerModule.forRoot(defaultLoggingConfig), AuthModule],
    controllers: [AppController],
    providers: [AppService, GraphlQlService],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer): any {
        consumer.apply(AuthMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL });
    }
}
