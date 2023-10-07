import { Module } from '@nestjs/common';
import { FoxValidatorModule } from '../fox-validator/fox-validator.module';
import { FoxTrailImporterService } from './trail/fox-importer.trail.service';
import { FoxCityImporterService } from './city/fox-importer.city.service';
import { FoxRegionImporterService } from './region/fox-importer.region.service';
import { FoxPartnerImporterService } from './partner/fox-importer.partner.service';
import { FoxCouponImporterService } from './coupon/fox-importer.coupon.service';
import { FoxImporterTrailController } from './trail/fox-importer.trail.controller';
import { FoxImporterCouponController } from './coupon/fox-importer.coupon.controller';
import { FoxImporterPartnerController } from './partner/fox-importer.partner.controller';
import { FoxImporterRegionController } from './region/fox-importer.region.controller';
import { FoxImporterJobController } from './job/fox-importer.job.controller';
import { ImporterMediaService } from '../importer-commons/importer.media.service';
import { FoxJobImporterService } from './job/fox-importer.job.service';

@Module({
    controllers: [
        FoxImporterTrailController,
        FoxImporterJobController,
        FoxImporterRegionController,
        FoxImporterPartnerController,
        FoxImporterCouponController,
        FoxImporterJobController,
    ],
    providers: [
        FoxTrailImporterService,
        FoxCityImporterService,
        FoxRegionImporterService,
        FoxPartnerImporterService,
        FoxCouponImporterService,
        ImporterMediaService,
        FoxJobImporterService,
    ],
    imports: [FoxValidatorModule],
})
export class FoxImporterModule {}
