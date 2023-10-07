import { BadRequestException, Controller, Get, HttpException, HttpStatus, Logger, Param, Query } from '@nestjs/common';
import { DirectusService, ExpGetAllTrailsResult } from '@foxtrail-backend/directus';
import { WPMLanguageCodeMap } from '../exp-importer.wpml';
import { ExpTrailImporterService } from './exp-importer.trail.service';
import { ExpValidatorService } from '../../exp-validator/exp-validator.service';
import { isValidLangQuery } from '../exp-importer.helpers';
import { promiseAllInBatches } from '../../fox-importer/fox-importer.helpers';

@Controller('web-importer/trail')
export class ExpImporterTrailController {
    private readonly logger = new Logger(ExpImporterTrailController.name);

    constructor(
        private readonly trailImporterService: ExpTrailImporterService,
        private readonly validatorService: ExpValidatorService,
        private readonly directusService: DirectusService,
    ) {}

    @Get('all')
    async importAllTrails(@Query() query) {
        let langsToImport: (keyof typeof WPMLanguageCodeMap)[] = [];
        if (!isValidLangQuery(query.langs)) throw new BadRequestException('Invalid lang query');
        if (query.langs) langsToImport = query.langs.split(',');

        const allTrails = (await this.directusService.getAllTrails()) as ExpGetAllTrailsResult;
        let selectedTrails = allTrails.filter((trail) => trail.status == 'LIVE').map((trail) => trail.identifier);
        if (query.country) {
            selectedTrails = allTrails.filter((trail) => trail.city['region'].country == query.country && trail.status == 'LIVE').map((trail) => trail.identifier);
        }

        return promiseAllInBatches(
            async (trailId: string) => {
                const validationResult = await this.validatorService.validateTrail(trailId, [...new Set(langsToImport.map((l) => WPMLanguageCodeMap[l]))], 'web');
                if (validationResult.valid_for_website) {
                    return await this.trailImporterService.importTrail(trailId, langsToImport);
                } else {
                    this.logger.error(`Trail ${trailId} or referenced items did not pass validation for website`);
                    return null;
                }
            },
            selectedTrails,
            3,
        );

        /*        const results = [];

        for (const trailId of selectedTrails) {
            const validationResult = await this.validatorService.validateTrail(trailId, [...new Set(langsToImport.map((l) => WPMLanguageCodeMap[l]))], 'web');
            if (validationResult.valid_for_website) {
                results.push(await this.trailImporterService.importTrail(trailId, langsToImport));
            } else {
                throw new HttpException('Trail or referenced items did not pass validation for website', HttpStatus.NOT_ACCEPTABLE);
            }
        }
        return results;*/
    }

    @Get(':id')
    async importTrail(@Param('id') identifier: string, @Query() query) {
        let langsToImport: (keyof typeof WPMLanguageCodeMap)[] = [];
        if (!isValidLangQuery(query.langs)) throw new BadRequestException('Invalid lang query');
        if (query.langs) langsToImport = query.langs.split(',');
        const validationResult = await this.validatorService.validateTrail(identifier, [...new Set(langsToImport.map((l) => WPMLanguageCodeMap[l]))], 'web');
        if (validationResult.valid_for_website) {
            return await this.trailImporterService.importTrail(identifier, langsToImport);
        } else {
            throw new HttpException('Trail or referenced items did not pass validation for website', HttpStatus.NOT_ACCEPTABLE);
        }
    }

    @Get('translate')
    async translateCollections() {
        return await this.trailImporterService.translateCollections();
    }
}
