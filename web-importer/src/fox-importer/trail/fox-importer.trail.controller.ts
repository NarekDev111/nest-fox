import { Controller, Get, HttpException, HttpStatus, Logger, Param, Query } from '@nestjs/common';
import { FoxTrailImporterService } from './fox-importer.trail.service';
import { FoxValidatorService } from '../../fox-validator/fox-validator.service';
import { WPMLanguageCodeMap } from '../fox-importer.wpml';
import { promiseAllInBatches } from '../fox-importer.helpers';
import { DirectusService, FoxCollection, FoxGetAllTrailsResult, FoxGetTrailResult } from '@foxtrail-backend/directus';

@Controller('web-importer/trail')
export class FoxImporterTrailController {
    private readonly logger = new Logger(FoxImporterTrailController.name);

    constructor(
        private readonly trailImporterService: FoxTrailImporterService,
        private readonly validatorService: FoxValidatorService,
        private readonly directusService: DirectusService,
    ) {}

    @Get('all')
    async importAllTrails(@Query() query) {
        let langsToImport: (keyof typeof WPMLanguageCodeMap)[] = Object.keys(WPMLanguageCodeMap) as (keyof typeof WPMLanguageCodeMap)[];
        if (query.langs) langsToImport = query.langs.split(',');
        let trails = (await this.directusService.getAllTrails()) as FoxGetAllTrailsResult;
        trails = trails.filter((t) => t.id !== 0); // filter out the "dummy" trail
        if (!trails) throw new Error(`No trails found!`);
        if (query.city) {
            trails = trails.filter((t) => (t.sales_city as FoxCollection['trails_sales_city'][]).some((c) => (c.sales_city_id as FoxCollection['sales_city']).id === query.city));
        }
        if (query.region) {
            trails = trails.filter((t) =>
                (t.sales_city as FoxCollection['trails_sales_city'][]).some((c) =>
                    ((c.sales_city_id as FoxCollection['sales_city']).sales_region as FoxCollection['sales_region_sales_city'][]).some((r) => r.sales_region_id === query.region),
                ),
            );
        }

        return promiseAllInBatches(
            async (t: FoxCollection['trails']) => {
                const validationResult = await this.validatorService.validateTrail(t.id, [...new Set(langsToImport.map((l) => WPMLanguageCodeMap[l]))], 'web');
                if (validationResult.valid_for_website || t.archived) {
                    return await this.trailImporterService.importTrail(t.id, langsToImport, query.metaOnly || false);
                } else {
                    this.logger.error(`Trail ${t.id} or referenced items did not pass validation for website`);
                    return null;
                }
            },
            trails,
            3,
        );
    }

    @Get(':id')
    async importTrail(@Param('id') identifier: number, @Query() query) {
        let langsToImport: (keyof typeof WPMLanguageCodeMap)[] = Object.keys(WPMLanguageCodeMap) as (keyof typeof WPMLanguageCodeMap)[];
        if (query.langs) langsToImport = query.langs.split(',');
        const validationResult = await this.validatorService.validateTrail(identifier, [...new Set(langsToImport.map((l) => WPMLanguageCodeMap[l]))], 'web');
        const trail = (await this.directusService.getTrail(identifier)) as FoxGetTrailResult;
        if (validationResult.valid_for_website || trail.archived) {
            return await this.trailImporterService.importTrail(identifier, langsToImport);
        } else {
            throw new HttpException('Trail or referenced items did not pass validation for website', HttpStatus.NOT_ACCEPTABLE);
        }
    }

    @Get('all/partners')
    async importAllPartners(@Query() query) {
        return await this.trailImporterService.importAllTrailPartners();
    }
}
