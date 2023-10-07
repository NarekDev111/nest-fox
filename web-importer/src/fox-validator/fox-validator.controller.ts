import { Controller, Get, Param, Query } from '@nestjs/common';
import { FoxValidatorService } from './fox-validator.service';
import { DirectusLanguageCode } from '../fox-importer/fox-importer.wpml';

@Controller('validator')
export class FoxValidatorController {
    constructor(private readonly validatorService: FoxValidatorService) {}

    @Get('web/trail/:id')
    async validateTrailForWeb(@Param('id') id: number, @Query() query) {
        let langsToImport: DirectusLanguageCode[] = [];
        if (query.langs) langsToImport = query.langs.split(',');
        //helloo
        return await this.validatorService.validateTrail(id, langsToImport, 'web');
    }

    @Get('app/trail/:id')
    async validateTrailForApp(@Param('id') id: number, @Query() query) {
        let langsToImport: DirectusLanguageCode[] = [];
        if (query.langs) langsToImport = query.langs.split(',');
        return await this.validatorService.validateTrail(id, langsToImport, 'app');
    }
}
