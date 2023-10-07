import { Module } from '@nestjs/common';
import { FoxValidatorController } from './fox-validator.controller';
import { FoxValidatorService } from './fox-validator.service';

@Module({
    controllers: [FoxValidatorController],
    providers: [FoxValidatorService],
    exports: [FoxValidatorService],
})
export class FoxValidatorModule {}
