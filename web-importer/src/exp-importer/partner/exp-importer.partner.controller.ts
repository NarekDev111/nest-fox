import { Controller, Get, Query } from '@nestjs/common';
import { ExpPartnerImporterService } from './exp-importer.partner.service';

@Controller('web-importer/partner')
export class ExpImporterPartnerController {
    constructor(private readonly partnerImporterService: ExpPartnerImporterService) {}
    @Get('all')
    async importAllTrailPartners(@Query() query) {
        return await this.partnerImporterService.importAllPartners();
    }
}
