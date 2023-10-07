import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from '@foxtrail-backend/prisma';
import { AuthModule } from '../auth/auth.module';
import { GameDetailsModule } from '../game-details/game-details.module';
import { ContactDetailsModule } from '../contact-details/contact-details.module';

@Module({
    imports: [AuthModule, GameDetailsModule, ContactDetailsModule],
    controllers: [AppController],
    providers: [AppService, PrismaService],
})
export class AppModule { }
