import { Test } from '@nestjs/testing';

import { CouponService } from './coupon.service';

describe('AppService', () => {
    let service: CouponService;

    beforeAll(async () => {
        const app = await Test.createTestingModule({
            providers: [CouponService],
        }).compile();

        service = app.get<CouponService>(CouponService);
    });

    describe('getData', () => {
        it('should return "Hello API"', () => {
            expect(service.getData()).toEqual({ message: 'Hello API' });
        });
    });
});
