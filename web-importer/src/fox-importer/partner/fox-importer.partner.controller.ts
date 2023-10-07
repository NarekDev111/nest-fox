import { Controller, Get, Query } from '@nestjs/common';
import { FoxPartnerImporterService } from './fox-importer.partner.service';

@Controller('web-importer/partner')
export class FoxImporterPartnerController {
    constructor(private readonly partnerImporterService: FoxPartnerImporterService) {}

    @Get('reseller')
    async importAllReseller(@Query() query) {
        return await this.partnerImporterService.importAllResellerAccounts();
    }

    @Get('all')
    async importAllTrailPartners(@Query() query) {
        return await this.partnerImporterService.importAllPartners();
    }
}
