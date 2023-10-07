import { Body, Controller, Post } from '@nestjs/common';
import { ExpPartnerImporterService } from '../partner/exp-importer.partner.service';
import { ExpSightImporterService } from './exp-importer.sight.service';

@Controller('web-importer/sight')
export class ExpImporterSightController {
    constructor(private readonly partnerImporterService: ExpPartnerImporterService, private readonly sightImporterService: ExpSightImporterService) {}

    @Post('/')
    async importSight(@Body() body) {
        for (const seoDescriptionId of body) {
            await this.sightImporterService.importSight(seoDescriptionId);
        }
        return 'OK';
    }
}
