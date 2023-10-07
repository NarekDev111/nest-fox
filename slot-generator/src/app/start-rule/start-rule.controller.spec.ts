import { Test, TestingModule } from '@nestjs/testing';
import { StartRuleController } from './start-rule.controller';

describe('StartRuleController', () => {
    let controller: StartRuleController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [StartRuleController],
        }).compile();

        controller = module.get<StartRuleController>(StartRuleController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
