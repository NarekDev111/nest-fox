import { Module } from '@nestjs/common';
import { SigmaController } from './sigma.controller';
import { SigmaService } from './sigma.service';

@Module({
    controllers: [SigmaController],
    providers: [SigmaService],
    exports: [SigmaService],
})
export class SigmaModule {}
