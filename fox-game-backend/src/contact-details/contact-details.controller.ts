import { Body, Controller, HttpStatus, Inject, Post, Res, UseGuards } from '@nestjs/common';
import { ContactDetailsService } from './contact-details.service';
import { AuthHeaderGuard } from '../auth-header.guard';
import { Request } from 'express';
import { Response } from 'express';
import { IContact_Details } from '../types/contact-details.dto';

@Controller('contact-details')
export class ContactDetailsController {
    constructor(private readonly contactDetailsService: ContactDetailsService, @Inject('REQUEST') private request: Request) { }
    @Post()
    @UseGuards(AuthHeaderGuard)
    async postContactDetails(
        @Res() response: Response,
        @Body() body: IContact_Details,
    ): Promise<string> {
        const authHeader = this.request.headers.authorization;
        const contactDetails = await this.contactDetailsService.postContactDetails(authHeader, body)
        if (!body.first_name || !body.last_name || !body.email || !body.phone_number || !body.date_of_birth) {
            response.status(HttpStatus.BAD_REQUEST).send('Missing data');
            return
        }
        if (contactDetails) {
            response.status(HttpStatus.OK).send(JSON.stringify(contactDetails));
            return;
        }
    }
}
