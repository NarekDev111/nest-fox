import { Test, TestingModule } from '@nestjs/testing';
import { StartRuleGeneratorService } from './start-rule-generator.service';

describe('StartRuleGeneratorService', () => {
    let service: StartRuleGeneratorService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [StartRuleGeneratorService],
        }).compile();

        service = module.get<StartRuleGeneratorService>(StartRuleGeneratorService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
