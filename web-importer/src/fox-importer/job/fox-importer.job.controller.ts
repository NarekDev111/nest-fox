import { Body, Controller, Logger, Post } from '@nestjs/common';
import { FoxJobImporterService } from './fox-importer.job.service';

@Controller('web-importer/job')
export class FoxImporterJobController {
    private readonly logger = new Logger(FoxImporterJobController.name);

    constructor(private readonly wcJobImporterService: FoxJobImporterService) {}

    @Post('/')
    async importJob(@Body('keys') ids: string[]) {
        return await this.wcJobImporterService.importJobs(ids);
    }
}
