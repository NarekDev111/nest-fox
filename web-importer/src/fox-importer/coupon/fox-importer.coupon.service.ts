import { Injectable, Logger } from '@nestjs/common';
import { transformCoupon } from './fox-importer.coupon.mapper';
import moment from 'moment/moment';
import { DirectusService } from '@foxtrail-backend/directus';
import { Coupon, WoocommerceService } from '@foxtrail-backend/woocommerce';

@Injectable()
export class FoxCouponImporterService {
    private readonly logger = new Logger(FoxCouponImporterService.name);

    constructor(private readonly directusService: DirectusService, private readonly woocommerceService: WoocommerceService) {}

    async importCoupons(ids: number[] = []) {
        let coupons = [];
        if (ids.length === 0) {
            coupons = await this.directusService.getAllCoupons();
        } else {
            coupons = await this.directusService.getCoupons(ids);
        }
        const activeCoupons = coupons.filter((coupon) => {
            if (coupon.coupon_begin_date && coupon.coupon_expiry_date) return moment(coupon.coupon_begin_date) <= moment() && moment(coupon.coupon_expiry_date) >= moment();
            else if (!coupon.coupon_begin_date && coupon.coupon_expiry_date) return moment(coupon.coupon_expiry_date) >= moment();
            else if (coupon.coupon_begin_date && !coupon.coupon_expiry_date) return moment(coupon.coupon_begin_date) <= moment();
            else return true;
        });

        const products = await this.woocommerceService.getAllProducts();

        /*
        const expiredCoupons = coupons.filter((coupon) => {
            if (coupon.coupon_expiry_date) return moment(coupon.coupon_expiry_date) <= moment();
        });l

        // cleanup expired coupons
        const wcCoupons = expiredCoupons.map(async (c) => {
            if (c && c.id) return await this.woocommerceService.getCouponByDirectusID(c.id);
        });
        const wcCouponsToDelete = (await Promise.all(wcCoupons)).map((c) => c?.id).filter((c) => c != null && c != undefined) as number[];
        await this.woocommerceService.batchUpdateCoupons([], [], wcCouponsToDelete);
        */

        // import active coupons
        for (const coupon of activeCoupons) {
            const validTrailIds = coupon.valid_trails?.map((t) => t.trails_id);
            const validTrailSalesCityIds = coupon.valid_sales_cities?.map((c) => c.sales_city_id?.trails.map((t) => t.trails_id)).flat();
            const validTrails = Array.from(new Set([...validTrailIds, ...validTrailSalesCityIds]));
            const validProductIds = validTrails.map((t) => products.filter((p) => p.sku === t?.toString()).map((p) => p.id)).flat();

            const wcCoupon = transformCoupon(coupon, validProductIds);
            if (!coupon.id) throw new Error('Coupon has no id');
            const existingCoupon = await this.woocommerceService.getCouponByCode(coupon.coupon_code);
            await this.runImport(wcCoupon, existingCoupon ? existingCoupon : null);
        }
    }

    private async runImport(coupon: Coupon, existingCoupon: Coupon | null) {
        if (existingCoupon) {
            coupon.id = existingCoupon.id;
            const result = await this.woocommerceService.updateCoupon(coupon);
            return result;
        } else {
            const result = await this.woocommerceService.createCoupon(coupon);
            return result;
        }
    }
}
