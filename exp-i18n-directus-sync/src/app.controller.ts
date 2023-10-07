import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { TrailExportDto } from './types/trail-export.dto';
import { GraphlQlService } from './graphl-ql/graphl-ql.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly graphQlService: GraphlQlService,
  ) {}

  @Get('/export/:identifier')
  async export(
    @Param('identifier') trailIdentifier: string,
    @Query('language') targetLanguage: string,
  ): Promise<TrailExportDto> {
    return await this.graphQlService.exportTrail(
      trailIdentifier,
      targetLanguage,
    );
  }

  @Post('/update')
  async update(
    @Query('language') targetLanguage: string,
    @Body() body: TrailExportDto,
  ): Promise<void> {
    await this.appService.updateTrail(body, targetLanguage);
  }


  // @Post('/phrase')
  // async createPhaseProject(
  //   @Query('fromLanguage') fromLanguage: string,
  //   @Query('toLanguages') toLanguages: string,
  //   @Body() body: TrailExportDto,
  // ): Promise<void> {
  //   // split toLanguages
  //   const targetLanguages = toLanguages.split(',');
  //   await this.appService.createPhaseProject(
  //     body,
  //     fromLanguage,
  //     targetLanguages,
  //   );
  // }
}
