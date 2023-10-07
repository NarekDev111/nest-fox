import { Controller, Get, Param, Query, Render, Response } from '@nestjs/common';
import { Response as Res } from 'express';
import { CouponService } from './coupon.service';

@Controller('coupon')
export class CouponController {
    constructor(private readonly couponService: CouponService) {}

    @Get(':orderId')
    @Render('index')
    async getCoupon(@Param('orderId') orderId: string, @Query('recipient') recipient: string) {
        return await this.couponService.getCouponTemplateData(orderId, recipient);
    }

    @Get('/pdf/:orderId')
    async getCouponAsPDF(@Response() res: Res, @Param('orderId') orderId: string, @Query('recipient') recipient: string) {
        const buffer = await this.couponService.printPDF(orderId, recipient);
        res.set({
            // pdf
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=coupon_${orderId}.pdf`,
            'Content-Length': buffer.length,

            // prevent cache
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
            Expires: 0,
        });

        return res.end(buffer);
    }
}
