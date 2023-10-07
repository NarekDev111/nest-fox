import { Module } from '@nestjs/common';
import { ContactDetailsController } from './contact-details.controller';
import { ContactDetailsService } from './contact-details.service';
import { PrismaService } from '@foxtrail-backend/prisma';

@Module({
    controllers: [ContactDetailsController],
    providers: [ContactDetailsService,PrismaService],
})
export class ContactDetailsModule {}
