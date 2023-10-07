import { Module } from '@nestjs/common';
import { GameDetailsController } from './game-details.controller';
import { GameDetailsService } from './game-details.service';
import { PrismaService } from '@foxtrail-backend/prisma';

@Module({
  controllers: [GameDetailsController],
  providers: [GameDetailsService,PrismaService],
})
export class GameDetailsModule {}