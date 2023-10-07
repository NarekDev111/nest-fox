import { Test, TestingModule } from '@nestjs/testing';

import { SigmaController } from './sigma.controller';
import { AppService } from './app.service';

describe('AppController', () => {
    let app: TestingModule;

    beforeAll(async () => {
        app = await Test.createTestingModule({
            controllers: [SigmaController],
            providers: [AppService],
        }).compile();
    });

    describe('getData', () => {
        it('should return "Hello API"', () => {
            const appController = app.get<SigmaController>(SigmaController);
            expect(appController.getData()).toEqual({ message: 'Hello API' });
        });
    });
});
