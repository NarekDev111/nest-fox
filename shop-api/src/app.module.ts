import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';

import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { defaultLoggingConfig, RequestLoggerMiddleware } from '@foxtrail-backend/logging';
import { AuthMiddleware, AuthModule } from '@foxtrail-backend/auth';
import { DirectusService } from '@foxtrail-backend/directus';
import { PrismaService } from '@foxtrail-backend/prisma';
import { BookingController } from './app/booking/booking.controller';
import { VoucherController } from './app/voucher/voucher.controller';
import { BookingService } from './app/booking/booking.service';
import { VoucherService } from './app/voucher/voucher.service';
import { PublicController } from './app/slot/public.controller';
import { SlotController } from './app/slot/slot.controller';
import { SlotService } from './app/slot/slot.service';
import { TeamController } from './app/team/team.controller';
import { TeamService } from './app/team/team.service';

@Module({
    imports: [ConfigModule.forRoot(), LoggerModule.forRoot(defaultLoggingConfig), AuthModule],
    controllers: [BookingController, TeamController, VoucherController, SlotController, PublicController],
    providers: [BookingService, TeamService, DirectusService, PrismaService, VoucherService, SlotService],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer): any {
        consumer.apply(RequestLoggerMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL });
        consumer.apply(AuthMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL });
    }
}
