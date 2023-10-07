import { Module } from '@nestjs/common';
import { ExpImporterCityController } from './city/exp-importer.city.controller';
import { ExpImporterPartnerController } from './partner/exp-importer.partner.controller';
import { ExpImporterCountryController } from './country/exp-importer.country.controller';
import { ExpImporterSightController } from './sight/exp-importer.sight.controller';
import { ExpImporterRegionController } from './region/exp-importer.region.controller';
import { ExpImporterTrailController } from './trail/exp-importer.trail.controller';
import { ExpCityImporterService } from './city/exp-importer.city.service';
import { ExpPartnerImporterService } from './partner/exp-importer.partner.service';
import { ExpCountryImporterService } from './country/exp-importer.country.service';
import { ExpSightImporterService } from './sight/exp-importer.sight.service';
import { ExpRegionImporterService } from './region/exp-importer.region.service';
import { ExpTrailImporterService } from './trail/exp-importer.trail.service';
import { ExpValidatorModule } from '../exp-validator/exp-validator.module';
import { ImporterMediaService } from '../importer-commons/importer.media.service';

@Module({
    controllers: [
        ExpImporterCityController,
        ExpImporterPartnerController,
        ExpImporterCountryController,
        ExpImporterSightController,
        ExpImporterRegionController,
        ExpImporterTrailController,
    ],
    providers: [
        ExpCityImporterService,
        ExpPartnerImporterService,
        ExpCountryImporterService,
        ExpSightImporterService,
        ExpRegionImporterService,
        ExpTrailImporterService,
        ImporterMediaService,
    ],
    imports: [ExpValidatorModule],
})
export class ExpImporterModule {}
