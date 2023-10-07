import { Controller, Param, Post, Query } from '@nestjs/common';
import { FoxCouponImporterService } from './fox-importer.coupon.service';

@Controller('web-importer/coupon')
export class FoxImporterCouponController {
    constructor(private readonly couponImporterService: FoxCouponImporterService) {}

    @Post('all')
    async importAllCoupons(@Query() query) {
        return await this.couponImporterService.importCoupons();
    }

    @Post(':id')
    async importTrail(@Param('id') id: number, @Query() query) {
        return await this.couponImporterService.importCoupons([id]);
    }
}
