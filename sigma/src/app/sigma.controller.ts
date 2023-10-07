import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { SigmaService } from './sigma.service';

@Controller('sigma')
export class SigmaController {
    constructor(private readonly sigmaService: SigmaService) {}

    @Get('generateInfoScreenDescriptions')
    async generateInfoScreenDescriptions(@Query('countryId') countryId: string) {
        return this.sigmaService.generateInfoScreenDescriptions(countryId);
    }

    @Get('generateSEODescriptions')
    async generateSEODescriptions(@Query('countryId') countryId: string) {
        return this.sigmaService.generateSEODescriptions(countryId);
    }

    @Post('generate-seo/:id')
    async importSight(@Param('id') trailId: string) {
        return this.sigmaService.generateSEODescriptions(trailId);
    }

    @Post('test/:city/:eventLocation')
    async test(@Param('city') cityName: string, @Param('eventLocation') eventLocationName: string) {
        return this.sigmaService.generateSEODescription(cityName, eventLocationName);
    }
}
