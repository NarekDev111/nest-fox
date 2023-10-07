import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaService } from '@foxtrail-backend/prisma';


@Module({
  controllers: [AuthController],
  providers: [AuthService, PrismaService],
})
export class AuthModule { }
