import { Body, Controller, Post } from '@nestjs/common';
import { VoucherService } from './voucher.service';

@Controller('voucher')
export class VoucherController {
    constructor(private readonly voucherService: VoucherService) {}

    @Post('onVoucherSegmentUpdate')
    async validateTrailForWeb(@Body('keys') voucherSegmentIds: string[]) {
        return await this.voucherService.refreshVoucherStatus(voucherSegmentIds);
    }

    @Post('refreshAllVouchers')
    async refreshAllVouchers() {
        const voucherSegments = await this.voucherService.getAllVoucherSegments();
        return await this.voucherService.refreshVoucherStatus(voucherSegments.map((vs) => vs.id.toString()));
    }
}
