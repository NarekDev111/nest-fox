import {TypeOf} from '@directus/sdk';
import {FoxCollection} from "@foxtrail-backend/directus";
import {Coupon} from "@foxtrail-backend/woocommerce";

export function transformCoupon(coupon: TypeOf<FoxCollection, 'coupon'>, productIds = []): Coupon {
    return {
        description: coupon.name ?? undefined,
        code: coupon.coupon_code ?? '',
        discount_type: CouponType[coupon.discount_type ?? 'percent'],
        amount: coupon.coupon_amount ?? 0,
        product_ids: productIds,
        date_expires: coupon.coupon_expiry_date ?? undefined,
        email_restrictions: coupon.allowed_emails ?? undefined,
        individual_use: coupon.individual_use_only ?? undefined,
        minimum_amount: coupon.minimum_spend ?? undefined,
        exclude_sale_items: coupon.exclude_sales_items ?? undefined,
        usage_limit: coupon.usage_limit_per_coupon ?? undefined,
        usage_limit_per_user: coupon.usage_limit_per_user ?? undefined
    };
}

enum CouponType {
    percent = 1,
    fixed_cart = 2,
    fixed_product = 3,
}
