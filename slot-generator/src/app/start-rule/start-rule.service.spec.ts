import { Test, TestingModule } from '@nestjs/testing';
import { StartRuleService } from './start-rule.service';

describe('StartRuleService', () => {
    let service: StartRuleService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [StartRuleService],
        }).compile();

        service = module.get<StartRuleService>(StartRuleService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
