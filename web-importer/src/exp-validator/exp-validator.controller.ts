import { BadRequestException, Controller, Get, HttpException, Param, Query } from '@nestjs/common';
import { ExpValidatorService } from './exp-validator.service';
import { DirectusLanguageCode } from '../exp-importer/exp-importer.wpml';
import { isValidLangQuery } from './exp-validator.helper';

@Controller('validator')
export class ExpValidatorController {
    constructor(private readonly validatorService: ExpValidatorService) {}

    @Get('web/trail/:id')
    async validateTrailForWeb(@Param('id') identifier: string, @Query() query) {
        let langsToImport: DirectusLanguageCode[] = [];
        if (!isValidLangQuery(query.langs)) throw new BadRequestException('Invalid lang query');
        if (query.langs) langsToImport = query.langs.split(',');
        return await this.validatorService.validateTrail(identifier, langsToImport, 'web');
    }

    @Get('app/trail/:id')
    async validateTrailForApp(@Param('id') identifier: string, @Query() query) {
        let langsToImport: DirectusLanguageCode[] = [];
        if (!isValidLangQuery(query.langs)) throw new BadRequestException('Invalid lang query');
        if (query.langs) langsToImport = query.langs.split(',');
        return await this.validatorService.validateTrail(identifier, langsToImport, 'app');
    }
}
