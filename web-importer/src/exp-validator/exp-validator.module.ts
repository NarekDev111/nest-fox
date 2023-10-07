import { Module } from '@nestjs/common';
import { ExpValidatorController } from './exp-validator.controller';
import { ExpValidatorService } from './exp-validator.service';

@Module({
    controllers: [ExpValidatorController],
    providers: [ExpValidatorService],
    exports: [ExpValidatorService],
})
export class ExpValidatorModule {}
