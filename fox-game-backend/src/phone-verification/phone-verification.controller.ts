import { Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import { PhoneVerificationService } from './phone-verification.service';
import { AuthHeaderGuard } from '../auth-header.guard';
import { Response } from 'express';

@Controller('send-verification-code')
export class PhoneVerificationController {
    constructor(private readonly gameDetailsService: PhoneVerificationService) { }
    @Post()
    @UseGuards(AuthHeaderGuard)
    async sendVerifyCode(
        @Res() response: Response
    ){
        return {}
    }
}
