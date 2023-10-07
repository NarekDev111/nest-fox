import { Injectable, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer';
import { DirectusService, ExpCollection, ExpGetTrailResult } from '@foxtrail-backend/directus';
import { Order, WoocommerceService } from '@foxtrail-backend/woocommerce';
import { GCloudStorageService } from '@foxtrail-backend/gcloud';

@Injectable()
export class CouponService {
    private readonly logger = new Logger(CouponService.name);

    constructor(
        private readonly directusService: DirectusService,
        private readonly woocommerceService: WoocommerceService,
        private readonly gcloudStorageService: GCloudStorageService,
    ) {}

    async getCouponTemplateData(orderId: string, recipient: string) {
        const order = (await this.woocommerceService.getOrder(orderId)) as Order;
        const trailId = order.line_items[0].sku;
        const trail = (await this.directusService.getTrail(trailId)) as ExpGetTrailResult;

        const trailImage = await this.gcloudStorageService.downloadFile('directus_upload', trail.image['filename_disk']);
        const b64TrailImage = trailImage[0].toString('base64');
        const trailStartLocationImage = await this.gcloudStorageService.downloadFile('directus_upload', trail.start_location_image['filename_disk']);
        const b64TrailStartLocationImage = trailStartLocationImage[0].toString('base64');

        return {
            orderId: orderId,
            recipient: recipient,
            buyerFirstName: order.billing.first_name,
            buyerLastName: order.billing.last_name,
            gameCode: order.line_items[0].meta_data.find((m) => m.key === 'Game code')?.value,
            trailId: trailId,
            trailCityName: ((trail.city as ExpCollection['city']).translations as ExpCollection['city_translations'][]).find((t) => t.languages_code == 'de-DE').name,
            trailShareUrl: trail.share_url,
            trailStartCoordinates: trail.start_location,
            trailImageUrl: `data:${trail.image['type']};base64,${b64TrailImage}`,
            trailStartLocationImageUrl: `data:${trail.start_location_image['type']};base64,${b64TrailStartLocationImage}`,
        };
    }

    async printPDF(orderId: string, recipient: string) {
        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.goto(`https://exp-manager-prod-xwqtu5y6iq-oa.a.run.app/coupon/${orderId}?recipient=${recipient}`, { waitUntil: 'networkidle0' });
        await page.emulateMediaType('print');
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();
        return pdfBuffer;
    }
}
