import { Test, TestingModule } from '@nestjs/testing';
import { StartRuleValidatorService } from './start-rule-validator.service';

describe('StartRuleValidatorService', () => {
    let service: StartRuleValidatorService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [StartRuleValidatorService],
        }).compile();

        service = module.get<StartRuleValidatorService>(StartRuleValidatorService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
