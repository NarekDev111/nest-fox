import {Injectable, Logger} from '@nestjs/common';
import {PrismaService} from '@foxtrail-backend/prisma';
import moment from 'moment/moment';

@Injectable()
export class VoucherService {
    private readonly logger = new Logger(VoucherService.name);

    constructor(private readonly prisma: PrismaService) {
    }

    async getAllVoucherSegments() {
        return this.prisma.voucher_segment.findMany();
    }

    async refreshVoucherStatus(voucherSegmentIds: string[]) {
        const results: { voucherId: number; result: string }[] = [];
        for (const voucherSegmentId of voucherSegmentIds) {
            const voucher = await this.prisma.voucher.findFirst({
                where: {
                    voucher_segment_voucher_segment_voucherTovoucher: {
                        some: {
                            id: parseInt(voucherSegmentId),
                        },
                    },
                },
                include: {
                    voucher_segment_voucher_segment_voucherTovoucher: true,
                },
            });

            if (!voucher) {
                this.logger.warn(`VoucherSegment ${voucherSegmentId} is not part of a voucher`);
                continue;
            }

            if (!voucher.deactivated) {
                if (moment(voucher.date_of_validity).add(2, 'weeks') <= moment()) {
                    await this.prisma.voucher.update({
                        where: {id: voucher.id},
                        data: {
                            deactivated: true,
                            reason_deactivation: '2',
                        },
                    });
                    results.push({
                        voucherId: voucher.id,
                        result: 'Voucher deactivated because date of validity (+2 weeks) has been reached'
                    });
                    continue;
                }

                if (
                    voucher.voucher_segment_voucher_segment_voucherTovoucher.every(
                        (segment) => segment.initial_count - segment.used_count == 0,
                    )
                ) {
                    await this.prisma.voucher.update({
                        where: {id: voucher.id},
                        data: {
                            deactivated: true,
                            reason_deactivation: '1',
                        },
                    });
                    results.push({
                        voucherId: voucher.id,
                        result: 'Voucher deactivated because all segments are used up'
                    });
                    continue;
                }
            } else {
                if (moment(voucher.date_of_validity).add(2, 'weeks') >= moment() && voucher.reason_deactivation === '2') {
                    await this.prisma.voucher.update({
                        where: {id: voucher.id},
                        data: {
                            deactivated: false,
                            reason_deactivation: '',
                        },
                    });
                    results.push({
                        voucherId: voucher.id,
                        result: 'Voucher reactivated because date of validity has been changed to the future (+2 weeks)'
                    });
                    continue;
                }

            }

            results.push({voucherId: voucher.id, result: 'Voucher remains unchanged'});
        }
        return results;
    }
}
