import { Controller, Get, HttpStatus, Query, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response } from 'express';

@Controller('authenticate')
export class AuthController {
  constructor(private readonly authService: AuthService) { }
  @Get()
  async getAuthDetails(
    @Query() queryParams: Record<string, undefined>,
    @Res() response: Response
  ): Promise<string> {
    if (!process.env['JWT_SECRET_KEY']) {
      response.status(HttpStatus.BAD_REQUEST).send('Missing JWT secret.')
      return
    }
    if (queryParams.code) {
      const authDetails = await this.authService.Auth(queryParams.code);
      if (authDetails) {
        response.status(HttpStatus.OK).send(JSON.stringify({ token: authDetails.token }));
        return;
      }
      response.status(HttpStatus.BAD_REQUEST).send('QR Code is not valid.')
      return
    }
    response.status(HttpStatus.BAD_REQUEST).send('Missing code.')
  }

}
