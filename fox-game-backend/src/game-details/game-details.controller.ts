import { Controller, Get, HttpStatus, Inject, Res, UseGuards } from '@nestjs/common';
import { GameDetailsService } from './game-details.service';
import { AuthHeaderGuard } from '../auth-header.guard';
import { Request } from 'express';
import { Response } from 'express';


@Controller('game-details')
export class GameDetailsController {
  constructor(private readonly gameDetailsService: GameDetailsService, @Inject('REQUEST') private request: Request) { }
  @Get()
  @UseGuards(AuthHeaderGuard)
  async getGameDetails(
    @Res() response: Response
  ): Promise<string> {
    const authHeader = this.request.headers.authorization;
    const gameDetails = await this.gameDetailsService.getGameDetails(authHeader);
    if (gameDetails) {
      response.status(HttpStatus.OK).send(JSON.stringify(gameDetails));
      return;
    }
  }
}
