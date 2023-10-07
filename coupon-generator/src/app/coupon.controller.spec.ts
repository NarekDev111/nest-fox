import { Test, TestingModule } from '@nestjs/testing';

import { CouponController } from './coupon.controller';
import { CouponService } from './coupon.service';

describe('AppController', () => {
    let app: TestingModule;

    beforeAll(async () => {
        app = await Test.createTestingModule({
            controllers: [CouponController],
            providers: [CouponService],
        }).compile();
    });

    describe('getData', () => {
        it('should return "Hello API"', () => {
            const appController = app.get<CouponController>(CouponController);
        });
    });
});
